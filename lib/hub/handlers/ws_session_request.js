module.exports = function onWsSessionRequest(baseConnection, sessionRequest) {
  const sbManager = this.deps.SandboxManager;
  const clientId = baseConnection.clientId;
  const sandbox = sbManager.getSandboxForClient(clientId);
  console.debug(`Hub: got ws_session_request ${sessionRequest}.`);
  if (sandbox) {
    console.debug(
      'Hub: received "session_request" but sandbox already exists, ignoring.');
    return;
  }
  sbManager.createSandboxForBaseConnection(baseConnection, (err) => {
    if (err) return console.error(err);
    sbManager.accept('ws_session_request', baseConnection, sessionRequest);
  });
};
