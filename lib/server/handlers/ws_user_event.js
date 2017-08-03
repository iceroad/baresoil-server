const assert = require('assert'),
  json = JSON.stringify,
  PublicError = require('../../errors/PublicError')
  ;

module.exports = function wsSessionResponse(clientId, userEvent) {
  assert(this.isServer());

  try {
    const client = this.getWebSocketClient(clientId);
    if (client) {
      const outStr = json(['user_event', userEvent]);
      client.websocket.send(outStr);
      this.stats_.outgoingBytes += outStr.length;
      this.stats_.outgoingMessages++;
      console.debug(`Sent user_event to client=${clientId}`);
    }
  } catch (e) {
    console.warn(e);
    return this.terminateWebSocket(clientId, new PublicError('internal'));
  }
};
