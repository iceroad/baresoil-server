const assert = require('assert'),
  construct = require('runtype').construct,
  states = require('../states'),
  PublicError = require('../../errors/PublicError')
  ;

module.exports = function onWsConnectionStart(websocket, req) {
  assert(this.isServer);
  const clientId = req.connection.clientId;
  const connectedAt = Date.now();
  const config = this.config_;
  const hostname = this.extractHostname(req);
  const remoteAddress = this.extractRemoteAddress(req);

  assert(clientId);
  assert(remoteAddress);
  assert(hostname);

  this.clientLog_(clientId, 'websocket_start', `${remoteAddress} Websocket ${req.url}`);

  // Save the client to the client registry with a protocol state of "HANDSHAKE".
  const client = this.clients_.wsConnections[clientId] = {
    clientId,
    connectedAt,
    hostname,
    remoteAddress,
    state: states.HANDSHAKE,
    timeouts: {},
    websocket,
    headers: this.extractHeaders(req),
  };

  // Set up Websocket listeners.
  websocket.on('message', this.onWsMessageIncoming.bind(this, clientId));
  websocket.on('error', this.onWsError.bind(this, clientId));
  websocket.once('close', this.onWsConnectionEnd.bind(this, clientId));

  // Retrieve the AppConfig.
  this.deps_.AppManager.get(null, { hostname }, (err, appConfig) => {
    if (err) {
      return this.terminateWebSocket(clientId, err);
    }
    client.appConfig = appConfig;
    const baseConnection = client.baseConnection = construct('BaseConnection', {
      hostname,
      appId: appConfig.appId,
      connectedAt,
      clientId,
      protocol: 'ws',
      remoteAddress,
    });
    if (client.sessionRequest) {
      client.state = states.SETUP;
      this.emit('ws_session_request', baseConnection, client.sessionRequest);
    }
  });

  // Set handshake timeout.
  client.timeouts.handshake = setTimeout(() => {
    if (!client.sessionRequest) {
      return this.terminateWebSocket(clientId, new PublicError('timeout', {
        message: 'Waited too long for a handshake.',
      }));
    }
  }, config.websocket.handshakeTimeoutMs);

  // Set maximum session duration timeout.
  client.timeouts.session = setTimeout(() => {
    return this.terminateWebSocket(clientId, new PublicError('timeout', {
      message: 'Exceeded maximum session duration.',
    }));
  }, config.websocket.maxSessionDurationMs);
};

