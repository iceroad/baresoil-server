const _ = require('lodash'),
  assert = require('chai').assert,
  clog = require('../../lib/util/clog').testMode(),
  fakedata = require('../fakedata'),
  json = JSON.stringify,
  sinon = require('sinon'),
  path = require('path'),
  timer = require('../../lib/util/timer'),
  BaresoilServer = require('../../lib/BaresoilServer'),
  TestConfig = require('../config.json')
  ;

const TEST_PROJECTS_DIR = path.resolve(__dirname, '../test_projects');

/* eslint-disable no-undef */
describe('Sandbox: container-based process isolation', function test() {
  let bsServer, sbPkgMinimal, baseConnection, appConfig, SandboxManager;
  let emissions;

  this.slow(3000);
  this.timeout(6000);

  beforeEach((cb) => {
    baseConnection = fakedata.BaseConnection();
    appConfig = fakedata.AppConfig();
    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    SandboxManager = bsServer.SandboxManager;
    sinon.stub(bsServer.Server, 'init').yields();
    sinon.stub(bsServer.Hub, 'init').yields();

    emissions = [];
    SandboxManager.on('*', (...evtArgs) => emissions.push(evtArgs));
    SandboxManager.on('sandbox_stdout', console.debug);
    SandboxManager.on('sandbox_stderr', console.debug);
    bsServer.init((err) => {
      if (err) return cb(err);
      const testPath = path.join(TEST_PROJECTS_DIR, 'minimal/server');
      bsServer.SerDe.createArchive(testPath, (err, tarball) => {
        if (err) return cb(err);
        sbPkgMinimal = tarball;
        return cb();
      });
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });


  describe('Session', () => {
    it('should boot a minimal app and authorize a session_request', (cb) => {
      const t = timer();
      SandboxManager.createSandbox(baseConnection, appConfig, sbPkgMinimal, (err) => {
        assert.isNotOk(err);
        _.defer(() => {
          SandboxManager.accept('ws_session_request', baseConnection, {
            userData: {
              someVal: 123,
            },
          });
        });
        SandboxManager.once('ws_session_response', (clientId, sessionResponse) => {
          console.debug(`Sandbox RTT: ${t.stop()}`);
          assert.strictEqual(clientId, baseConnection.clientId);
          assert.deepEqual(sessionResponse.userData, {
            someUserData: 123,
          });
          assert.isTrue(sessionResponse.auth);
          return cb();
        });
      });
    });


    it('should boot a minimal app and fail on session_request error', (cb) => {
      SandboxManager.createSandbox(baseConnection, appConfig, sbPkgMinimal, (err) => {
        assert.isNotOk(err);
        _.defer(() => {
          SandboxManager.accept('ws_session_request', baseConnection, {
            userData: {
              fail: true,
            },
          });
        });
        SandboxManager.once('ws_session_response', (clientId, sessionResponse) => {
          assert.strictEqual(clientId, baseConnection.clientId);
          assert.isFalse(sessionResponse.auth);
          return cb();
        });
      });
    });
  });

  describe('Remote procedure calls', () => {
    beforeEach((cb) => {
      SandboxManager.createSandbox(baseConnection, appConfig, sbPkgMinimal, (err) => {
        assert.isNotOk(err);
        _.defer(() => {
          SandboxManager.accept('ws_session_request', baseConnection, {
            userData: {
              someVal: 123,
            },
          });
        });
        SandboxManager.once('ws_session_response', (clientId, sessionResponse) => {
          assert.strictEqual(clientId, baseConnection.clientId);
          assert.deepEqual(sessionResponse.userData, {
            someUserData: 123,
          });
          assert.isTrue(sessionResponse.auth);
          return cb();
        });
      });
    });

    it('should be able to perform an RPC without errors', (cb) => {
      _.defer(() => {
        SandboxManager.accept('ws_rpc_request', baseConnection.clientId, {
          requestId: 1,
          function: 'nested.echo',
          argument: {
            someData: 789,
          },
        });
      });
      SandboxManager.once('ws_rpc_response', (clientId, rpcResponse) => {
        assert.deepEqual(rpcResponse, {
          requestId: 1,
          result: {
            someData: 789,
          },
        });
        return cb();
      });
    });

    it('should be able to perform an RPC with errors', (cb) => {
      _.defer(() => {
        SandboxManager.accept('ws_rpc_request', baseConnection.clientId, {
          requestId: 2,
          function: 'nested.returnError',
          argument: {
            someData: 789,
          },
        });
      });
      SandboxManager.once('ws_rpc_response', (clientId, rpcResponse) => {
        assert.deepEqual(rpcResponse, {
          requestId: 2,
          error: {
            code: 'internal',
            message: 'native error returned',
          },
        });
        return cb();
      });
    });


    it('should be able to perform an RPC that throws exceptions', (cb) => {
      _.defer(() => {
        SandboxManager.accept('ws_rpc_request', baseConnection.clientId, {
          requestId: 2,
          function: 'nested.throwException',
          argument: {
            someData: 789,
          },
        });
      });
      SandboxManager.once('ws_rpc_response', (clientId, rpcResponse) => {
        assert.deepEqual(rpcResponse, {
          requestId: 2,
          error: {
            code: 'exception',
            message: 'Function "nested.throwException" threw an exception.',
          },
        });
        return cb();
      });
    });


    it('should return the correct error code on invalid function names', (cb) => {
      _.defer(() => {
        SandboxManager.accept('ws_rpc_request', baseConnection.clientId, {
          requestId: 4,
          function: 'nested.nonExistent',
          argument: {
            someData: 789,
          },
        });
      });
      SandboxManager.once('ws_rpc_response', (clientId, rpcResponse) => {
        assert.deepEqual(rpcResponse, {
          requestId: 4,
          error: {
            code: 'not_found',
            message: 'Function "nested.nonExistent" not found.',
          },
        });
        return cb();
      });
    });


    it('should be able to receive server-sent user_events', (cb) => {
      _.defer(() => {
        SandboxManager.accept('ws_rpc_request', baseConnection.clientId, {
          requestId: 2,
          function: 'sendUserEvent',
        });
      });
      SandboxManager.on('ws_user_event', (clientId, userEvent) => {
        assert.deepEqual(userEvent, {
          name: 'my_event',
          data: {
            myData: 123,
          },
        });
        return cb();
      });
    });
  });


  describe('HTTP request methods except for GET and HEAD', () => {
    beforeEach((cb) => {
      SandboxManager.createSandbox(baseConnection, appConfig, sbPkgMinimal, (err) => {
        assert.isNotOk(err);
        return cb();
      });
    });

    it('should respond to HTTP requests with HTTP responses', (cb) => {
      const httpReq = {
        requestId: 1,
        method: 'POST',
        url: '/index.html',
        headers: {},
      };
      _.defer(() => {
        SandboxManager.accept('http_request', baseConnection, httpReq);
      });
      SandboxManager.on('http_response', (clientId, httpResponse) => {
        assert.deepEqual(httpResponse, {
          requestId: 1,
          statusCode: 200,
          headers:  {
            'Content-Type': 'text/plain',
            'X-Some-Header': 'gargleblaster',
          },
          body: 'SGVsbG8sIHdvcmxkIQ==',
        });
        return cb();
      });
    });
  });
});
