const _ = require('lodash'),
  assert = require('assert'),
  json = JSON.stringify,
  states = require('../states'),
  PublicError = require('../../errors/PublicError')
  ;

// Response to a WebSocket session authorization request.
module.exports = function wsSessionResponse(clientId, sessionResponse) {
  assert(this.isServer());

  if (sessionResponse.auth) {
    // Client authorized.
    try {
      if (this.isWebSocketClientAlive(clientId)) {
        const client = this.getWebSocketClient(clientId);
        client.state = states.READY;
        const outStr = json(['session_response', sessionResponse]);
        client.websocket.send(outStr);
        this.stats_.outgoingMessages++;
        this.stats_.outgoingBytes += outStr.length;
      }
    } catch (e) {
      console.warn(e);
      return this.terminateWebSocket(clientId, new PublicError('internal'));
    }
  } else {
    // Client not authorized, must be disconnected.
    const errMessage = _.get(sessionResponse, 'error.message');
    const errDetails = {};
    if (errMessage) errDetails.message = errMessage;
    return this.terminateWebSocket(
      clientId, new PublicError('forbidden', errDetails));
  }
};
