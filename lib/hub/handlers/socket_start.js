const col = require('../../util/colutil');

module.exports = function onSocketStart(clientId, socketInfo) {
  this.clientLog_(clientId, 'socket_start',
    `clientId=${col.bold(clientId)} ` +
    `remoteAddress=${col.bold(socketInfo.remoteAddress)}`);
};
