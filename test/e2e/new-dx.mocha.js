const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  construct = require('runtype').construct,
  fakedata = require('../fakedata'),
  request = require('request'),
  BaresoilClient = require('../../client'),
  BaresoilServer = require('../../lib/BaresoilServer'),
  TestConfig = require('../config.json'),
  WebSocket = require('ws')
  ;


xdescribe('End-to-end API test: new developer experience', function test() {
  let bsServer, username;

  this.slow(15000);
  this.timeout(30000);

  beforeEach((cb) => {
    username = fakedata.Email();
    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    bsServer.init(cb);
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });

  function generateProject() {
    const hostname = fakedata.Hostname();
    const sentinel = _.random(0, Number.MAX_SAFE_INTEGER);

    // Generate an HTML client file at index.html
    const clientFileData = Buffer.from(`
<doctype html>
<html>
  <body>sentinel: ${sentinel}</body>
</html>`, 'utf-8');
    const clientFileUpload = construct('FileUploadRequest', {
      component: 'client',
      path: 'index.html',
      data: clientFileData.toString('base64'),
    });

    // Generate a WebSocket and HTTP server package at index.js
    const serverFileData = Buffer.from(`\
module.exports = {

  $http(httpPostRequest, cb) {
    return cb(null, {
      headers: {
        'Content-Type': 'application/javascript',
      },
      body: Buffer.from(JSON.stringify({
        sentinel: ${sentinel},
        unicode: 🚩,
      }), 'utf-8').toString('base64'),
    });
  },

  $websocket(sessionRequest, cb) {
    return cb();  // Accept all WebSocket connections.
  },

  echo(fnArg, cb) {
    return cb(null, fnArg);
  },

  sentinel(cb) {
    return cb(null, ${sentinel});
  },

};`, 'utf-8');
    const serverFileUpload = construct('FileUploadRequest', {
      component: 'server',
      path: 'index.js',
      data: serverFileData.toString('base64'),
    });

    return {
      hostname,
      sentinel,
      clientFileData,
      clientFileUpload,
      serverFileData,
      serverFileUpload,
    };
  }

  function createClient(hostname) {
    return new BaresoilClient({
      endpoint: bsServer.Server.getWebSocketEndpoint(),
      hostname,
    });
  }

  it('account signup -> app create -> deploy -> access', (cb) => {
    // Create an instance of BaresoilClient to connect to the server.
    const project = generateProject();
    const bsClient = createClient();

    async.series([
      // Wait till the client connects.
      cb => bsClient.once('connected', cb),

      // Create new user account using the default sysapp API.
      cb => bsClient.run('account.create', {
        username,
        password: 'catscatscats!!!☕',
      }, cb),

      // Login to account.
      cb => bsClient.run('account.login', {
        username,
        password: 'catscatscats!!!',
      }, cb),

      // Create an app.
      cb => bsClient.run('app.create', {
        name: 'A test app',
        hostname,
      }, (err, newAppConfig) => {
        appConfig = newAppConfig;
        return cb(err);
      }),

      // Start a deployment stage
      cb => bsClient.run('deploy.stage', {
        appId: appConfig.appId,
      }, cb),

      // Upload a client-side file.
      cb => bsClient.run('deploy.upload', clientFileUpload, cb),

      // Upload the server-side file.
      cb => bsClient.run('deploy.upload', serverFileUpload, cb),

      // Commit the deployment.
      cb => bsClient.run('deploy.commit', {
        message: 'first deployment!',
      }, cb),

      // Ensure that static content is being served at the app's hostname.
      cb => async.series([
        // Retrieve the index document using an HTTP GET request.
          (cb) => {
            const reqOptions = {
              url: `${bsServer.Server.getHttpEndpoint()}/`,
              headers: {
                Host: hostname,
                'User-Agent': 'testagent',
              },
            };
            request(reqOptions, (error, response) => {
              if (error) {
                return cb(error);
              }
              assert.strictEqual(response.statusCode, 200);
              assert.isDefined(response.headers.etag);
              assert.match(response.body, /Testing/i);
              assert.strictEqual(response.headers['content-type'], 'text/html');
              return cb();
            });
          },
          // Ensure an invalid URL results in a 404.
          (cb) => {
            const reqOptions = {
              url: `${bsServer.Server.getHttpEndpoint()}/junk/invalid.png`,
              headers: {
                Host: hostname,
                'User-Agent': 'testagent',
              },
            };
            request(reqOptions, (error, response) => {
              if (error) {
                return cb(error);
              }
              assert.strictEqual(response.statusCode, 404);
              assert.match(response.body, /doctype html/i);
              assert.match(response.body, /404/i);
              assert.match(response.body, /not found/i);
              assert.isUndefined(response.headers.etag);
              assert.strictEqual(response.headers['content-type'], 'text/html');
              return cb();
            });
          },
        ], cb),

      // Ensure that HTTP POST requests are being processed by the app's API.
      cb => async.series([
          // TODO:
        ], cb),

      // Ensure that WebSocket connections are served the app's API.
      cb => async.series([
          // Connect to the app via another WebSocket.
          (cb) => {
            bsClientUser.connect();
            bsClientUser.once('connected', cb);
          },
          // Run the 'echo' function in the app we just committed.
          (cb) => {
            bsClientUser.run('echo', 12345, (err, result) => {
              assert.isNotOk(err);
              assert.strictEqual(result, 12345);
              return cb();
            });
          },
          // Run the 'constant' function.
          (cb) => {
            bsClientUser.run('constant', (err, result) => {
              assert.isNotOk(err);
              assert.strictEqual(result, 'Gargleblaster.');
              return cb();
            });
          },
        ], cb),

    ], cb);
  });
});
