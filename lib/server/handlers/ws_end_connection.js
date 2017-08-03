const assert = require('assert');

// Request for termination of an active client. The client may have already
// terminated by the time this request is received.
module.exports = function wsEndConnection(baseConnection, publicError) {
  assert(this.isServer());
  return this.terminateWebSocket(baseConnection.clientId, publicError);
};
