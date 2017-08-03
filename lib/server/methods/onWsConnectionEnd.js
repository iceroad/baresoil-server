const assert = require('assert');

// An active connection has closed, either due to disconnect or us calling
// wsKillConnection() on it. Clean up data structures.
module.exports = function onWsConnectionEnd(clientId) {
  assert(this.isServer);
  this.clientLog_(clientId, 'websocket_end');

  const client = this.clients_.wsConnections[clientId];
  if (client) {
    if (client.sessionRequest) {
      this.emit('ws_session_end', clientId);
    }
    try {
      client.websocket.terminate();
    } catch (e) { }
    delete this.clients_.wsConnections[clientId];
  }
};
