const assert = require('assert');

function onSocketEnd(clientId) {
  assert(this.isServer);
  const sock = this.sockets_[clientId];
  if (sock) {
    delete this.sockets_[clientId];
    this.emit('socket_end', clientId, sock.socketInfo);
  }
}

module.exports = onSocketEnd;
