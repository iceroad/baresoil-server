const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  fs = require('fs'),
  construct = require('runtype').construct,
  PublicError = require('../../errors/PublicError')
  ;


module.exports = function onHttpRequest(req, res) {
  assert(this.isServer);
  const clientId = req.connection.clientId;
  const connectedAt = Date.now();
  const config = this.config_;
  const hostname = this.extractHostname(req);
  const remoteAddress = this.extractRemoteAddress(req);
  const fileUploads = req.files || [];

  assert(clientId);
  assert(remoteAddress);
  assert(hostname);

  this.clientLog_(clientId, 'http_request', `${remoteAddress} HTTP ${req.method} ${req.url}`);

  // If there are file uploads in this request, create a function to clean
  // them up by deleting them from disk.
  const cleanupFilesFn = _.once(() => {
    if (fileUploads.length) {
      _.forEach(fileUploads, (fileInfo) => {
        fs.unlink(fileInfo.path, (err) => {
          if (err) {
            console.warn(
              `Cannot delete temporary file upload "${fileInfo.path}": ` +
              `${err.message}`);
          } else {
            console.debug(`Deleted file upload "${fileInfo.path}"`);
          }
        });
      });
    }
  });

  // Classify requests as either (GET or HEAD) or (everything else).
  const httpMethod = req.method.toUpperCase();
  const isGetOrHead = (httpMethod === 'GET' || httpMethod === 'HEAD');
  const isOptions = (httpMethod === 'OPTIONS');

  // Return early for OPTIONS.
  if (isOptions) {
    cleanupFilesFn();
    res.writeHead(200, {
      Allow: config.http.allowedMethods.join(', '),
      'Content-Length': 0,
    });
    return res.end();
  }

  // See if the HTTP method is allowed.
  if (!_.find(config.http.allowedMethods, m => m === httpMethod)) {
    cleanupFilesFn();
    return this.failHttpRequest(req, res, new PublicError('bad_method'));
  }

  // For non-GET/HEAD requests, ensure that URLs match the global prefix
  // for methods that invoke a sandbox. Otherwise, return HTTP 405: Method
  // not Allowed.
  if (!isGetOrHead) {
    const urlPrefix = config.http.urlPrefix;
    if (urlPrefix) {
      if (req.url.substr(0, urlPrefix.length) !== urlPrefix) {
        cleanupFilesFn();
        return this.failHttpRequest(req, res, new PublicError('bad_method'));
      }
    }
  }

  // Copy non-file fields into a base HttpRequest object.
  const httpRequest = {
    requestId: _.random(1, Number.MAX_SAFE_INTEGER),
    method: httpMethod,
    url: req.url,
    body: req.body,
    cookies: req.cookies,
    headers: this.extractHeaders(req),
  };

  return async.auto({
    //
    // Retrieve AppConfig using the final hostname extracted from the HTTP request.
    //
    appConfig: (cb) => {
      return this.deps_.AppManager.get(null, {
        hostname,
      }, (err, appConfig) => cb(err, appConfig));
    },

    //
    // Create a BaseConnection for this HTTP request. Note that the clientId
    // field comes from the underlying socket, so HTTP requests streamed over
    // a keep-alive (or HTTP/2) connection will be routed to the same sandbox
    // instance.
    //
    baseConnection: ['appConfig', (deps, cb) => {
      const appConfig = deps.appConfig;

      // Create a BaseConnection.
      const baseConnection = construct('BaseConnection', {
        hostname,
        appId: appConfig.appId,
        connectedAt,
        clientId,
        protocol: 'http',
        remoteAddress,
      });

      return cb(null, baseConnection);
    }],

    //
    // At this point, HTTP GET and HEAD requests can be served.
    //
    staticFileServed: ['appConfig', (deps, cb) => {
      // For GET/HEAD requests, attempt to serve the file from the application's
      // client-side project.
      if (isGetOrHead) {
        this.serveClientFile(deps.appConfig, deps.baseConnection, req, res);
        return cb(null, true); // true = request has been handled
      }
      return cb();
    }],

    // If no static file was served, then read file uploads from disk in
    // order to pass to the sandbox.
    files: ['appConfig', 'staticFileServed', (deps, cb) => {
      if (deps.staticFileServed) return cb();
      const readers = _.map(fileUploads, uploadInfo => (cb) => {
        return fs.readFile(uploadInfo.path, (err, fileBuffer) => {
          if (err) {
            console.error(err);
            return cb(new PublicError('internal'));
          }
          return cb(null, {
            filename: uploadInfo.originalname,
            mimeType: uploadInfo.mimetype,
            size: fileBuffer.length,
            data: fileBuffer.toString('base64'),
          });
        });
      });
      return async.parallelLimit(readers, 3, cb);
    }],

    httpRequest: ['files', (deps, cb) => {
      const files = deps.files;
      if (files && files.length) {
        httpRequest.files = files;
      }
      return cb(null, construct('HttpRequest', httpRequest));
    }],

  }, (err, results) => {
    cleanupFilesFn();
    if (err) {
      return this.failHttpRequest(req, res, err);
    }
    if (results.staticFileServed) {
      // Nothing more to do if static file served.
      return;
    }

    // Must emit "http_request".
    const httpRequest = results.httpRequest;

    // Register this request in the client's HTTP request registry.
    const clients = this.clients_.httpRequests;
    const pendingRequests = clients[clientId] = clients[clientId] || {};
    pendingRequests[httpRequest.requestId] = {
      reqTime: Date.now(),
      appConfig: results.appConfig,
      baseConnection: results.baseConnection,
      req,
      res,
    };

    // Emit "http_request".
    this.emit('http_request', results.baseConnection, httpRequest);
  });
};
