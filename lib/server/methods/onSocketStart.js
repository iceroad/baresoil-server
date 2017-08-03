const assert = require('assert'),
  construct = require('runtype').construct
  ;

function onSocketStart(socket) {
  assert(this.isServer);

  // Enable HTTP keepalive.
  socket.setKeepAlive(true);

  // Generate metadata for this socket connection.
  const clientId = socket.clientId = this.genClientId();
  const connectedAt = Date.now();
  const remoteAddress = socket.remoteAddress; // Set by net.Socket
  const socketInfo = construct('SocketInfo', {
    clientId,
    connectedAt,
    remoteAddress,
  });
  this.sockets_[clientId] = {
    socketInfo,
    socket,
  };

  // Emit the "socket_start" message.
  this.emit('socket_start', clientId, socketInfo);

  // Listen for socket death.
  socket.once('close', this.onSocketEnd.bind(this, clientId));
}

module.exports = onSocketStart;
