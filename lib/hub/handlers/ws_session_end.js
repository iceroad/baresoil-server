module.exports = function onWsSessionEnd(clientId) {
  this.deps.SandboxManager.destroySandbox(clientId);
};
