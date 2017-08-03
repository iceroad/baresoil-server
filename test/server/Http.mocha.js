const _ = require('lodash'),
  assert = require('chai').assert,
  construct = require('runtype').construct,
  clog = require('../../lib/util/clog').testMode(),
  crypto = require('crypto'),
  request = require('request'),
  sinon = require('sinon'),
  textBuffer = require('../../lib/util/textBuffer'),
  json = JSON.stringify,
  BaresoilServer = require('../../lib/BaresoilServer'),
  TestConfig = require('../config.json')
  ;


describe('Server: non-WebSocket HTTP request handling', function () {
  let bsServer, emissions, config;

  this.slow(1000);
  this.timeout(3000);

  beforeEach((cb) => {
    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    emissions = [];
    sinon.stub(bsServer.Hub, 'init').yields();
    sinon.stub(bsServer.SandboxManager, 'init').yields(null, bsServer.SandboxManager);
    bsServer.Server.on('*', (...evtArgs) => emissions.push(evtArgs));
    bsServer.init((err, results) => {
      if (err) return cb(err);
      config = results.Config.Server;
      return cb();
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });


  it('should emit HTTP POST requests to the root endpoint', (cb) => {
    const reqUrl = `${bsServer.Server.getHttpEndpoint()}`;
    const reqOptions = {
      url: reqUrl,
      method: 'POST',
      headers: {
        Host: 'localhost',
        'User-Agent': 'testagent',
        'X-Custom-Header': 'Some text here',
      },
    };

    // Wait for incoming HTTP request event at server, return 200 OK response.
    bsServer.Server.once('http_request', (baseConnection, httpRequest) => {
      assert.strictEqual(httpRequest.method, 'POST');
      assert.strictEqual(httpRequest.url, config.http.urlPrefix);

      const headers = httpRequest.headers;
      assert.strictEqual(headers.host, 'localhost');
      assert.strictEqual(headers['x-custom-header'], 'Some text here');

      // Emit response.
      const response = construct('HttpResponse', {
        requestId: httpRequest.requestId,
        statusCode: 200,
        headers: {
          'Content-Type': 'text/html',
        },
        body: textBuffer('<body>hi!</body>').toString('base64'),
      });

      bsServer.Server.accept('http_response', baseConnection.clientId, response);
    });

    // Make HTTP POST request, wait for response.
    request(reqOptions, (error, response, body) => {
      if (error) return cb(error);
      assert.strictEqual(response.statusCode, 200);
      assert.match(body, /hi!/i);
      return cb();
    });
  });


  it('should emit HTTP PUT requests to an arbitrary endpoint', (cb) => {
    const reqUrl = `${bsServer.Server.getHttpEndpoint()}/inner.png?q=1`;
    const reqOptions = {
      url: reqUrl,
      method: 'PUT',
    };

    // Make HTTP GET request
    _.defer(() => {
      request(reqOptions, (error, response, body) => {
        return cb(new Error('should not return.'));
      });
    });

    // Wait for incoming HTTP request event at server.
    bsServer.Server.once('http_request', (baseConnection, httpRequest) => {
      assert.strictEqual(httpRequest.method, 'PUT');
      return cb();
    });
  });


  it('should not accept unrecognized HTTP methods', (cb) => {
    const reqUrl = `${bsServer.Server.getHttpEndpoint()}/something/inner.png?q=1`;
    const reqOptions = {
      url: reqUrl,
      method: 'JUNKO',
    };

    // Make HTTP "JUNKO" request, expect a socket error.
    _.defer(() => {
      request(reqOptions, (error, response, body) => {
        assert.isOk(error);
        assert.strictEqual(emissions.length, 2);
        return cb();
      });
    });
  });


  it('should be able to perform HTTP 304 redirects', (cb) => {
    const reqUrl = `${bsServer.Server.getHttpEndpoint()}/something/inner.png?q=1`;
    const reqOptions = {
      url: reqUrl,
      method: 'POST',
      followRedirect: false,
    };

    // Wait for incoming HTTP request event at server, return 200 OK response.
    bsServer.Server.once('http_request', (baseConnection, httpRequest) => {
      // Emit HTTP 304 response.
      const response = construct('HttpResponse', {
        requestId: httpRequest.requestId,
        statusCode: 304,
        headers: {
          Location: '/bad.html',
        },
      });
      bsServer.Server.accept('http_response', baseConnection.clientId, response);
    });

    // Make HTTP GET request, expect a redirect.
    request(reqOptions, (error, response, body) => {
      assert.isNotOk(error);
      assert.strictEqual(response.statusCode, 304);
      return cb();
    });
  });

  it('should emit HTTP POST requests with URL-encoded data fields', (cb) => {
    const reqUrl = `${bsServer.Server.getHttpEndpoint()}cgi-bin/haha.pl?q=123`;
    const reqOptions = {
      url: reqUrl,
      method: 'POST',
      form: {
        dataField1: 123,
        dataField2: 'some text',
      },
    };

    // Make HTTP GET request
    _.defer(() => {
      request(reqOptions, (error, response, body) => {
        return cb(new Error('should not return.'));
      });
    });

    // Wait for incoming HTTP request event at server.
    bsServer.Server.once('http_request', (baseConnection, httpRequest) => {
      assert.strictEqual(httpRequest.method, 'POST');
      assert.strictEqual(httpRequest.url, '/__bs__/cgi-bin/haha.pl?q=123');
      assert.strictEqual(httpRequest.body.dataField2, 'some text');
      assert.strictEqual(httpRequest.body.dataField1, '123');
      return cb();
    });
  });

  it('should emit HTTP POST requests with multipart file uploads', (cb) => {
    const reqUrl = `${bsServer.Server.getHttpEndpoint()}cgi-bin/haha.pl?q=123`;
    const reqOptions = {
      url: reqUrl,
      method: 'POST',
      headers: {
        'X-Custom-Header': 42,
      },
    };

    // Make HTTP GET request
    _.defer(() => {
      const req = request.post(reqOptions);
      const form = req.form();
      form.append('file', crypto.randomBytes(32), {
        filename: 'test-upload.jpg',
        contentType: 'application/octet-stream',
      });
    });

    // Wait for incoming HTTP request event at server.
    bsServer.Server.once('http_request', (baseConnection, httpRequest) => {
      assert.strictEqual(httpRequest.files.length, 1);
      assert.strictEqual(httpRequest.files[0].filename, 'test-upload.jpg');
      assert.strictEqual(httpRequest.files[0].mimeType, 'application/octet-stream');
      assert.strictEqual(httpRequest.files[0].size, 32);
      assert.strictEqual(httpRequest.url, '/__bs__/cgi-bin/haha.pl?q=123');
      assert.strictEqual(httpRequest.headers['x-custom-header'], '42');
      return cb();
    });
  });
});
