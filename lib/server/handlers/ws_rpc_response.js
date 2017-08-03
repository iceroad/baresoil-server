const assert = require('assert'),
  json = JSON.stringify,
  states = require('../states'),
  PublicError = require('../../errors/PublicError')
  ;

module.exports = function wsSessionResponse(clientId, rpcResponse) {
  assert(this.isServer());

  try {
    if (this.isWebSocketClientAlive(clientId)) {
      const client = this.getWebSocketClient(clientId);
      if (client.state === states.READY) {
        const outStr = json(['rpc_response', rpcResponse]);
        client.websocket.send(outStr);
        this.stats_.outgoingBytes += outStr.length;
        this.stats_.outgoingMessages++;
      }
    }
  } catch (e) {
    console.warn(e);
    return this.terminateWebSocket(clientId, new PublicError('internal'));
  }
};
