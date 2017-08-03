module.exports = function onSandboxEnd(clientId, sandboxExitInfo) {
  this.clientLog_(clientId, 'sandbox_end', JSON.stringify(sandboxExitInfo));
};
