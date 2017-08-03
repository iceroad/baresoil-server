const bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  express = require('express'),
  http = require('http'),
  multer = require('multer'),
  ws = require('ws')
  ;

module.exports = function createServer(config) {
  // Create Express app to handle non-Websocket HTTP requests.
  const app = this.expressApp_ = express();
  app.disable('x-powered-by');

  // Parse cookies into "req.cookies" using library "cookie-parser"
  app.use(cookieParser());

  // Parse request bodies in application/x-www-form-urlencoded format using
  // library "body-parser".
  //
  // Options reference:
  // https://github.com/expressjs/body-parser#bodyparserurlencodedoptions
  app.use(bodyParser.urlencoded({
    extended: false,
    limit: config.http.maxBodySizeBytes,
  }));

  // Parse request bodies in application/json format using "body-parser".
  //
  // Options reference:
  // https://github.com/expressjs/body-parser#bodyparserjsonoptions
  app.use(bodyParser.json({
    limit: config.http.maxBodySizeBytes,
  }));

  // Handle multipart-form request bodies using library "multer".
  //
  // Options reference:
  // https://github.com/expressjs/multer
  const multerOpt = {
    dest: this.uploadsDir_,
    limits: {
      parts: config.http.maxPartsPerUpload,
      files: config.http.maxFilesPerUpload,
      fileSize: config.http.maxFileSizeBytes,
    },
  };
  if (config.http.urlPrefix) {
    app.use(config.http.urlPrefix, multer(multerOpt).any());
  } else {
    app.use(multer(multerOpt).any());
  }

  // Non-websocket HTTP request handler.
  app.use(this.onHttpRequest.bind(this));

  // Create HTTP server with Express app in request chain.
  const server = this.httpServer_ = http.createServer(app);

  // Assign each new raw socket a unique identifier and save it to the
  // active socket registry.
  server.on('connection', this.onSocketStart.bind(this));

  // Create a Websocket server attached to the base HTTP server.
  //
  // Options reference:
  // https://github.com/websockets/ws/blob/master/doc/ws.md
  const wsOptions = {
    maxPayload: config.websocket.maxMessageSizeBytes,
    path: config.websocket.endpoint,
    perMessageDeflate: config.websocket.perMessageDeflate,
    server: this.httpServer_,
    verifyClient: this.onWsVerifyClient.bind(this),
  };
  this.wsServer_ = new ws.Server(wsOptions);
  this.wsServer_.on('connection', this.onWsConnectionStart.bind(this));
  this.wsServer_.on('error', this.onWsError.bind(this));

  return server;
};
