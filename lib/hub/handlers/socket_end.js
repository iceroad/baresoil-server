const col = require('../../util/colutil'),
  moment = require('moment')
;

module.exports = function onSocketEnd(clientId, socketInfo) {
  const m = moment(socketInfo.connectedAt);
  this.clientLog_(clientId, 'socket_end',
    `clientId=${col.bold(clientId)} ` +
    `remoteAddress=${col.bold(socketInfo.remoteAddress)} ` +
    `connected=${col.bold(m.fromNow())}`);
  this.deps.SandboxManager.destroySandbox(clientId);
};
