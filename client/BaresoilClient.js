const assert = require('assert'),
  EventEmitter = require('events'),
  WebSocket = require('ws')
  ;

const STATES = {
  offline: 'offline',
  connecting: 'connecting',
  setup: 'setup',
  connected: 'connected',
};

class BaresoilClient extends EventEmitter {
  constructor(config) {
    super();
    assert(typeof config === 'object', 'config parameter required.');

    if (!config.endpoint) {
      assert(
        config.server,
        '"config.server" must be specified if "config.endpoint" is not.');
      assert(
        config.sysPrefix,
        '"config.sysPrefix" must be specified if "config.endpoint" is not.');
      const confServer = config.server.replace(/\/+$/g, '');
      const confPrefix = config.sysPrefix.replace(/\/+$/g, '');
      config.endpoint = `${confServer}${confPrefix}/live`;
    }

    this.config_ = config;
    this.state_ = STATES.offline;
    this.listeners_ = {};
    this.error_ = {};
    this.sessionRequest_ = config.sessionRequest;
    this.rpcCallbacks_ = {};
    this.nextRpcId_ = 1;
    setTimeout(() => {
      this.emit('connection_status', 'offline');
    }, 0);
  }

  setSessionRequest(sessionRequest) {
    this.sessionRequest_ = sessionRequest;
  }

  getConnectionStatus() {
    return this.STATES;
  }

  getSessionRequest() {
    return this.sessionRequest_;
  }

  getSessionResponse() {
    return this.sessionResponse_;
  }

  getLastError() {
    return this.error_;
  }

  getEndpoint() {
    return this.config_.endpoint;
  }

  connect() {
    if (this.state_ === STATES.connecting ||
        this.state_ === STATES.setup ||
        this.state_ === STATES.connected) {
      return;
    }
    const config = this.config_;
    const opt = {
      headers: {},
    };
    if (config.host) opt.headers.Host = config.host;
    if (config.origin) opt.origin = config.origin;
    if (config.agent) opt.agent = config.agent;
    const ws = this.ws_ = new WebSocket(config.endpoint, opt);
    const listeners = this.listeners_;
    ws.on('error', listeners.error = this.onError_.bind(this));
    ws.on('open', listeners.open = this.onOpen_.bind(this));
    ws.on('close', listeners.close = this.onClose_.bind(this));
    ws.on('message', listeners.message = this.onMessage_.bind(this));
    this.state_ = STATES.connecting;
  }

  disconnect() {
    if (this.state_ === STATES.offline) return;
    try {
      this.ws_.close();
    } catch (e) {
      try {
        this.ws_.terminate();
      } catch (e) { }
    }
  }

  run(fnName, fnArgs, cb) {
    if (typeof fnArgs === 'function' && !cb) {
      cb = fnArgs;
      fnArgs = undefined;
    }

    const makeRequest = () => {
      const requestId = this.nextRpcId_++;
      const rpcRequest = {
        requestId,
        function: fnName,
      };
      if (typeof fnArgs !== 'undefined') {
        rpcRequest.argument = fnArgs;
      }
      this.rpcCallbacks_[requestId] = cb;
      this.sendFrame_(['rpc_request', rpcRequest]);
    };

    if (this.state_ === STATES.offline) {
      this.connect();
      this.once('connected', makeRequest);
    } else {
      makeRequest();
    }
  }

  onOpen_() {
    this.state_ = STATES.setup;
    this.sendFrame_(['session_request', {
      userData: this.sessionRequest_,
    }]);
    this.emit('connection_status', 'setup');
  }

  onError_(error) {
    this.error_ = error;
    this.state_ = STATES.ERROR;
    this.emit('error', error);
    try {
      this.ws_.terminate();
    } catch (e) {
      console.warn(e);
    }
  }

  onMessage_(msgStr) {
    this.emit('incoming_message_raw', msgStr);

    let inArray;
    try {
      inArray = JSON.parse(msgStr);
      if (!inArray || !inArray.length) {
        throw new Error('Invalid frame received from server.');
      }
    } catch (error) {
      return this.onError_(error);
    }
    const cmd = inArray[0];

    if (cmd === 'error') {
      return this.onError_[inArray[1]];
    }

    if (cmd === 'session_response') {
      this.sessionResponse_ = inArray[1];
      if (!inArray[1].auth) {
        return this.onError_(this.sessionResponse_.error);
      }
      this.state_ = STATES.connected;
      this.emit('connection_status', 'connected');
      this.emit('connected');
      return;
    }

    if (cmd === 'rpc_response') {
      const rpcResponse = inArray[1];
      const cb = this.rpcCallbacks_[rpcResponse.requestId];
      if (!cb) {
        console.error(
          `Received RPC response for unknown request "${rpcResponse.requestId}"`);
        return;
      }
      delete this.rpcCallbacks_[rpcResponse.requestId];
      return cb(rpcResponse.error, rpcResponse.result);
    }

    if (cmd === 'user_event') {
      const userEvent = inArray[1];
      return this.emit('user_event', userEvent.name, userEvent.data);
    }

    console.error(`Unknown frame type "${cmd}" received from server.`);
  }

  onClose_(code, reason) {
    this.state_ = STATES.offline;
    this.emit('close', code, reason);
  }

  removeListeners_() {
    const listeners = this.listeners_;
    assert(listeners && typeof listeners === 'object');
    Object.keys(listeners).forEach((evtName) => {
      this.ws_.removeEventListener(evtName, listeners[evtName]);
      delete listeners[evtName];
    });
  }

  sendFrame_(outArray, cb) {
    assert(outArray && outArray.length, 'require array argument');
    try {
      this.ws_.send(JSON.stringify(outArray), () => {
        if (cb) return cb();
      });
    } catch (e) {
      // Only throw when write fails in connected or setup.
      if (this.states_ === STATES.connected ||
          this.states_ === STATES.setup) {
        if (cb) return cb(e);
        throw e;
      }
    }
  }
}

BaresoilClient.STATES = STATES;

module.exports = BaresoilClient;
