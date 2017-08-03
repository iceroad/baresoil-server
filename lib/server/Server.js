const _ = require('lodash'),
  assert = require('assert'),
  chalk = require('chalk'),
  crypto = require('crypto'),
  fqdnescape = require('../util/fqdnescape'),
  fs = require('fs'),
  fse = require('fs-extra'),
  http = require('http'),
  path = require('path'),
  pug = require('pug'),
  states = require('./states'),
  url = require('url'),
  AcceptHandlers = require('./handlers'),
  ClassMethods = require('./methods'),
  EventIO = require('event-io'),
  Spec = require('./Server.spec'),
  WSCodes = require('../errors/ws-codes')
  ;


class Server extends EventIO {
  init(deps, cb) {
    this.$schema = Spec; // Sets emit() and accept() runtype schemas.
    this.setAcceptHandlers(AcceptHandlers); // Allows typed accept().
    this.sockets_ = {}; // Maps clientId to active net.Socket
    this.clients_ = {
      wsConnections: {}, // Maps clientId to active WebSocket connection.
      httpRequests: {}, // Maps clientId to pending HTTP POST requests.
    };
    this.stats_ = {
      incomingMessages: 0, // Total number of incoming Websocket messages.
      incomingBytes: 0, // Total number of incoming bytes.
      outgoingMessages: 0, // Total number of outgoing messages.
      outgoingBytes: 0, // Total number of outgoing bytes.
    };
    this.deps_ = deps;
    this.appManager_ = deps.AppManager;
    this.makeError_ = deps.MakeError.make.bind(deps.MakeError);
    this.clientLog_ = deps.EventLog.client.bind(deps.EventLog);
    const config = this.config_ = deps.Config.Server;
    const servAddr = `${chalk.bold(config.address)}:${chalk.bold(config.port)}`;

    // Ensure uploads directory exists.
    const uploadsDir = this.uploadsDir_ = path.resolve(
      config.http.uploadsDirectory, `baresoil_data/${process.pid}/uploads`);
    try {
      fse.ensureDirSync(uploadsDir);
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      console.debug(`HTTP uploads will be buffered in directory "${uploadsDir}"`);
    } catch (e) {
      console.debug(e);
      throw new Error(
        `Cannot create temporary uploads directory "${uploadsDir}": ${e.message}`);
    }

    // Load system-wide error page template.
    this.loadErrorTemplate(config.errorTemplatePug);

    // Create HTTP server with Websocket and regular HTTP request support.
    const server = this.createServer(config);

    // Start server.
    server.listen(config.port, config.address, (err) => {
      if (err) {
        return cb(new Error(`Cannot listen at ${servAddr}: ${err.message}.`));
      }
      console.info(
        'Server is listening at ' +
        `${chalk.bold(`http://localhost:${this.getListenPort()}/`)}`);
      return cb(null, this);
    });
  }

  loadErrorTemplate(filePath) {
    const templPath = filePath || path.resolve(__dirname, 'static/error.pug');
    try {
      this.errorPageTemplate_ = pug.compileFile(templPath);
    } catch (e) {
      console.debug(e);
      throw new Error(
        `Cannot compile base error page template "${templPath}" using Pug: ` +
          `${e.message}`);
    }
  }

  renderErrorPage(req, err) {
    let reqUrl = req.url;
    try {
      reqUrl = url.parse(req.url).pathname;
      if (reqUrl === '/') reqUrl = '/index.html';
    } catch (e) { reqUrl = '<malformed>'; }

    return this.errorPageTemplate_({
      code: err.httpStatusCode || 500,
      reason: http.STATUS_CODES[err.httpStatusCode] || 'Internal Error',
      error: err.message,
      showHome: reqUrl === '/index.html' ? false : true,
    });
  }

  destroy(deps, cb) {
    console.debug('Stopping server...');
    const httpServer = this.httpServer_;
    if (httpServer && httpServer.listening) {
      try {
        this.wsServer_.close();
      } catch (e) {}
      try {
        httpServer.close();
      } catch (e) {}
    }
    if (this.uploadsDir_) {
      try {
        console.debug(`Deleting temporary uploads directory "${this.uploadsDir_}"…`);
        fse.removeSync(this.uploadsDir_);
        delete this.uploadsDir_;
      } catch (e) {
        console.warn(e);
      }
    }
    return cb();
  }

  genClientId() {
    const pid = _.toString(process.pid);
    const prefix = ((pid.length % 2 === 1) ? 'fff' : 'ff');
    return crypto.randomBytes(16).toString('hex') + prefix + pid;
  }

  getHttpEndpoint() {
    return `http://localhost:${this.getListenPort()}${this.config_.http.urlPrefix}`;
  }

  getWebSocketEndpoint() {
    return `ws://localhost:${this.getListenPort()}${this.config_.websocket.endpoint}`;
  }

  getNumClients() {
    return {
      websocket: _.size(this.clients_.wsConnections),
      http: _.size(this.clients_.httpRequests),
    };
  }

  getStats() {
    return _.merge({}, this.stats_, {
      numClients: this.getNumClients(),
    });
  }

  getListenPort() {
    return this.httpServer_.address().port;
  }

  isServer() {
    return true;
  }

  terminateWebSocket(clientId, error) {
    let pubError = error;
    if (!pubError.isPublicError) {
      console.warn(new Error('terminateWebSocket() called without PublicError'));
      pubError = this.makeError_('internal', {
        message: error.message,
      });
    }

    const client = this.clients_.wsConnections[clientId];
    if (client && client.websocket) {
      // Try to send a detailed error message to the client.
      try {
        const rs = client.websocket.readyState;
        if (rs === 1) { // ws.ReadyState = OPEN
          client.websocket.send(pubError.toProtocolArray());
        }
      } catch (e) {
        console.warn(e);
      }

      // Register shutdown state.
      client.state = states.SHUTDOWN;

      // Wait a short period of time before terminating the socket to allow the
      // error write to complete. This is a best-effort endeavor to prevent
      // abuse via socket spam.
      setTimeout(() => {
        // Try to gracefully, and then forcibly close the socket.
        try {
          client.websocket.close(pubError.wsCloseCode || WSCodes.INTERNAL_ERROR);
        } catch (e) {
          console.warn(e);
          try {
            client.websocket.terminate();
          } catch (e) { }
        }
      }, this.config_.websocket.socketCleanupTimeMs);
    } else {
      console.debug(`terminateWebSocket() called on invalid clientId "${clientId}"`);
    }
  }

  failHttpRequest(req, res, err) {
    assert(err.isPublicError);
    const clientId = req.connection.clientId;
    const rendered = Buffer.from(this.renderErrorPage(req, err), 'utf-8');
    const headers = {
      'Content-Type': 'text/html',
      'Content-Length': rendered.length,
    };
    try {
      res.writeHead(err.httpStatusCode, headers);
    } catch (e) {
      console.warn(e);
    }
    try {
      res.end(rendered);
    } catch (e) {
      console.warn(e);
    }
    this.clientLog_(clientId, 'http_response',
      `HTTP ${err.httpStatusCode}: ${err.message}`);
  }

  extractRemoteAddress(httpReq) {
    let remoteAddr;
    const trustProxyHeaders = this.config_.trustProxyHeaders;
    if (trustProxyHeaders) {
      remoteAddr = _.get(httpReq, 'headers.x-forwarded-for');
    }
    remoteAddr = remoteAddr || _.get(httpReq, 'connection.remoteAddress');
    remoteAddr = remoteAddr || _.get(httpReq, 'connection.socket.remoteAddress');
    return remoteAddr;
  }

  extractHeaders(httpReq) {
    return httpReq.headers;
  }

  extractHostname(httpReq) {
    return fqdnescape(httpReq.headers.host || httpReq.hostname);
  }

  isWebSocketClientAlive(clientId) {
    const client = this.getWebSocketClient(clientId);
    if (client) {
      if (client.websocket.readyState === 1) { // 'ws' readyState 1 = OPEN
        return true;
      }
    }
  }

  getWebSocketClient(clientId) {
    return this.clients_.wsConnections[clientId];
  }
}

// Load class methods into prototype from individual files.
_.extend(Server.prototype, ClassMethods);
Server.prototype.$spec = Spec;

module.exports = Server;
