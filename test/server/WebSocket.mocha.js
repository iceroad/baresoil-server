/* eslint no-undef: "ignore" */
const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  construct = require('runtype').construct,
  clog = require('../../lib/util/clog').testMode(),
  fakedata = require('../fakedata'),
  minimist = require('minimist')
  sinon = require('sinon'),
  states = require('../../lib/server/states'),
  json = JSON.stringify,
  BaresoilServer = require('../../lib/BaresoilServer'),
  PublicError = require('../../lib/errors/PublicError'),
  TestConfig = require('../config.json'),
  WebSocket = require('ws'),
  WsCodes = require('../../lib/errors/ws-codes')
  ;


describe('Server: WebSocket handling', function () {
  let bsServer, emissions, config, ws

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

      sinon.stub(bsServer.AppManager, 'getAppConfigFromHttpRequest').callsFake((req, cb) => {
        return cb(null, bsServer.AppManager.getSysappConfig());
      });

      config = results.Config.Server;
      return cb();
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });


  it('should timeout clients on unsent handshakes', (cb) => {
    config.websocket.handshakeTimeoutMs = 200;
    const testStartTime = Date.now();
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('close', (wsCloseCode) => {
      const testDuration = Date.now() - testStartTime;
      assert.isAbove(testDuration, 200);
      assert.strictEqual(wsCloseCode, WsCodes.CLOSE_NORMAL);
      assert.strictEqual(emissions.length, 2);
      assert.deepEqual(_.map(emissions, _.first), [
        'socket_start', 'socket_end']);
      return cb();
    });
  });


  it('should terminate double handshakes', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send('');  // should ignore blank line
      ws.send(json(['session_request', fakedata.SessionRequest()]));
      ws.send(json(['session_request', fakedata.SessionRequest()]));
    });
    let error;
    ws.once('message', inMsg => {
      error = JSON.parse(inMsg);
    });
    ws.once('close', (wsCloseCode) => {
      assert.strictEqual(error[0], 'error');
      assert.strictEqual(error[1].code, 'bad_request');
      assert.match(error[1].message, /already sent handshake/i);
      assert.strictEqual(wsCloseCode, WsCodes.CLOSE_PROTOCOL_ERROR);
      assert.strictEqual(emissions.length, 4);
      assert.deepEqual(_.map(emissions, _.first), [
          'socket_start',
          'ws_session_request',
          'ws_session_end',
          'socket_end']);
      return cb();
    });
  });


  it('should terminate bad handshakes', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json(['rpc_request', {}]));
    });
    let error;
    ws.once('message', inMsg => {
      error = JSON.parse(inMsg);
    });
    ws.once('close', (wsCloseCode) => {
      assert.strictEqual(error[0], 'error');
      assert.strictEqual(error[1].code, 'bad_request');
      assert.match(error[1].message, /expected literal "session_request"/i);
      assert.strictEqual(wsCloseCode, WsCodes.CLOSE_PROTOCOL_ERROR);
      assert.strictEqual(emissions.length, 2);
      return cb();
    });
  });


  it('should terminate clients that send malformed requests', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send('garbage.');
    });
    let error;
    ws.once('message', inMsg => {
      error = JSON.parse(inMsg);
    });
    ws.once('close', (wsCloseCode) => {
      assert.strictEqual(error[0], 'error');
      assert.strictEqual(error[1].code, 'bad_request');
      assert.match(error[1].message, /invalid protocol message/i);
      assert.strictEqual(wsCloseCode, WsCodes.CLOSE_PROTOCOL_ERROR);
      assert.strictEqual(emissions.length, 2);
      return cb();
    });
  });


  it('should terminate clients that send non-array top-level JSON values', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json({request: 1}));
    });
    let error;
    ws.once('message', inMsg => {
      error = JSON.parse(inMsg);
    });
    ws.once('close', (wsCloseCode) => {
      assert.strictEqual(error[0], 'error');
      assert.strictEqual(error[1].code, 'bad_request');
      assert.match(error[1].message, /invalid protocol message/i);
      assert.strictEqual(wsCloseCode, WsCodes.CLOSE_PROTOCOL_ERROR);
      assert.strictEqual(emissions.length, 2);
      return cb();
    });
  });


  it('should timeout sessions longer than the maximum connection duration', (cb) => {
    config.websocket.maxSessionDurationMs = 200;
    config.websocket.handshakeTimeoutMs = 100;
    const testStartTime = Date.now();
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json(['session_request', fakedata.SessionRequest()]));
    });
    let error;
    ws.once('message', inMsg => {
      error = JSON.parse(inMsg);
    });
    ws.once('close', (wsCloseCode) => {
      const testDuration = Date.now() - testStartTime;
      assert.strictEqual(error[0], 'error');
      assert.strictEqual(error[1].code, 'timeout');
      assert.match(error[1].message, /maximum session duration/i);
      assert.isAbove(testDuration, 200);
      assert.strictEqual(wsCloseCode, WsCodes.CLOSE_NORMAL);
      assert.strictEqual(emissions.length, 4);
      return cb();
    });
  });


  xit('should reject connections to unknown apps', (cb) => {
    sinon.stub(bsServer.AppManager, 'get').yields(new PublicError('not_found'));
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('close', (err) => {
      assert.match(err.message, /unexpected server response/i);
      assert.strictEqual(emissions.length, 0);
      return cb();
    });
  });


  it('should buffer handshake packets received before an AppConfig is found', (cb) => {
    // Return getAppConfigFromHttpRequest after a small delay to allow the
    // handshake packet to be received and buffered.
    sinon.stub(bsServer.AppManager, 'get').callsFake((junk_, httpReq, cb) => {
      _.delay(() => {
        return cb(null, bsServer.AppManager.getSysappConfig());
      }, 100);
    });
    const sessionRequest = fakedata.SessionRequest();

    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json(['session_request', sessionRequest]));
    });

    bsServer.Server.on('ws_session_request', (baseConnection, sessionRequest) => {
      assert.doesNotThrow(() => construct('BaseConnection', baseConnection));
      assert.isOk(sessionRequest.userData);
      ws.close();
      return cb();
    });
  });


  it('should drop connections on receiving a negative "session_response"', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json(['session_request', fakedata.SessionRequest()]));
    });

    bsServer.Server.on('ws_session_request', (baseConnection, sessionRequest) => {
      // Send a negative session_response.
      _.defer(() => {
        bsServer.Server.accept(
            'ws_session_response',
            baseConnection.clientId,
            fakedata.SessionResponse(false));
      });

      // Catch error.
      let error;
      ws.once('message', (msgStr) => error = JSON.parse(msgStr));

      // Wait for client to be terminated
      ws.once('close', (closeEvtcode) => {
        assert.strictEqual(error.length, 2);
        assert.strictEqual(error[0], 'error');
        assert.strictEqual(error[1].code, 'forbidden');
        _.defer(() => {
          assert.strictEqual(bsServer.Server.getNumClients().websocket, 0);
          return cb();
        });
      });
    });
  });


  it('should authorize a connection on receiving a positive "session_response"', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json(['session_request', fakedata.SessionRequest()]));
    });

    bsServer.Server.on('ws_session_request', (baseConnection, sessionRequest) => {
      // Ensure server connection is in state SETUP.
      assert.strictEqual(
          bsServer.Server.getWebSocketClient(baseConnection.clientId).state,
          states.SETUP);

      // Send a session_response.
      _.defer(() => {
        bsServer.Server.accept(
            'ws_session_response',
            baseConnection.clientId,
            fakedata.SessionResponse(true));
      });

      // Wait for client to receive it.
      ws.on('message', (msgStr) => {
        const inArray = JSON.parse(msgStr);
        assert.strictEqual(inArray.length, 2);
        assert.strictEqual(inArray[0], 'session_response');
        assert.strictEqual(inArray[1].auth, true);
        assert.deepEqual(inArray[1].userData, {
          nested: {
            inner: 123,
          },
        });

        // Ensure server connection is in state SETUP.
        assert.strictEqual(
            bsServer.Server.getWebSocketClient(baseConnection.clientId).state,
            states.READY);
        assert.strictEqual(bsServer.Server.getNumClients().websocket, 1);

        // Ensure that a "ws_session_end" event is emitted.
        ws.close();
        ws.once('close', () => {
          _.delay(() => {
            assert.strictEqual(4, emissions.length);
            assert.strictEqual(_.last(emissions)[0], 'socket_end');
            return cb();
          }, 10);
        });
      });
    });
  });


  it('should forward "rpc_request" and return "rpc_response" and "user_event"', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    let baseConnection;
    return async.series([
      // Request session and authorize it.
      (cb) => {
        ws.once('open', () => {
          ws.send(json(['session_request', fakedata.SessionRequest()]));
        });
        bsServer.Server.once('ws_session_request', (bc, sessionRequest) => {
          baseConnection = bc;
          // Send a session_response.
          _.defer(() => {
            bsServer.Server.accept(
                'ws_session_response',
                baseConnection.clientId,
                fakedata.SessionResponse(true));
          });

          // Wait for client to receive session_response.
          ws.once('message', (msgStr) => {
            const inArray = JSON.parse(msgStr);
            assert.strictEqual(inArray[0], 'session_response');
            assert.strictEqual(inArray[1].auth, true);
            return cb();
          });
        });
      },

      // Send "rpc_request", ensure server receives it.
      (cb) => {
        _.defer(() => {
          ws.send(json(['rpc_request', fakedata.RpcRequest()]));
        });
        bsServer.Server.once('ws_rpc_request', (inClientId, rpcRequest) => {
          assert.doesNotThrow(() => construct('RpcRequest', rpcRequest));
          assert.strictEqual(inClientId, baseConnection.clientId);
          _.defer(() => {
            bsServer.Server.accept(
                'ws_rpc_response',
                baseConnection.clientId,
                fakedata.RpcResponse(rpcRequest));
          });

          // Wait for client to receive rpc_response
          ws.once('message', (msgStr) => {
            const inArray = JSON.parse(msgStr);
            assert.strictEqual(inArray[0], 'rpc_response');
            assert.doesNotThrow(() => construct('RpcResponse', inArray[1]));
            return cb();
          });
        });
      },

      // Send "user_event", ensure client receives it.
      (cb) => {
        // Send a user_event
        _.delay(() => {
          bsServer.Server.accept(
              'ws_user_event',
              baseConnection.clientId,
              fakedata.UserEvent());
        }, 10);

        // Wait for client to receive session_response.
        ws.once('message', (msgStr) => {
          const inArray = JSON.parse(msgStr);
          assert.strictEqual(inArray[0], 'user_event');
          return cb();
        });
      },
   ], cb);
  });


  it('should forward "user_event" to the client during handshake', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    let baseConnection;
    ws.once('open', () => {
      ws.send(json(['session_request', fakedata.SessionRequest()]));
    });
    bsServer.Server.once('ws_session_request', (bc, sessionRequest) => {
      baseConnection = bc;

      // Send a user_event
      _.defer(() => {
        bsServer.Server.accept(
            'ws_user_event',
            baseConnection.clientId,
            fakedata.UserEvent());
      });

      // Wait for client to receive session_response.
      ws.once('message', (msgStr) => {
        const inArray = JSON.parse(msgStr);
        assert.strictEqual(inArray[0], 'user_event');
        return cb();
      });
    });
  });


  it('should generate "ws_session_end" on unclean client terminations', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json(['session_request', fakedata.SessionRequest()]));
    });

    bsServer.Server.once('ws_session_request', (baseConnection, sessionRequest) => {
      // Terminate the client.
      _.delay(() => {
        ws.terminate();
      }, 10);

      // Wait for server ws_session_end
      bsServer.Server.once('ws_session_end', (clientId) => {
        assert.strictEqual(baseConnection.clientId, clientId);
        return cb();
      });
    });
  });



  it('should reject invalid commands in the ready state', (cb) => {
    const ws = new WebSocket(bsServer.Server.getWebSocketEndpoint());
    ws.once('open', () => {
      ws.send(json(['session_request', fakedata.SessionRequest()]));
    });

    bsServer.Server.once('ws_session_request', (baseConnection, sessionRequest) => {
      // Send a session_response.
      _.defer(() => {
        bsServer.Server.accept(
            'ws_session_response',
            baseConnection.clientId,
            fakedata.SessionResponse(true));
      });

      // Receive session response at client and send garbage.
      ws.once('message', (inMsgStr) => {
        ws.send(json(['invalid_command']));
        ws.once('close', (wsCloseCode) => {
          return cb();
        });
      });
    });
  });
});
