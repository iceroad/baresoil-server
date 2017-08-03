const assert = require('assert');

module.exports = function onHttpRequest(baseConnection, httpRequest) {
  assert(this.isHub);
  const clientId = baseConnection.clientId;
  const sbManager = this.deps.SandboxManager;
  const sandbox = sbManager.getSandboxForClient(clientId);
  if (sandbox) {
    // If the sandbox exists, pass on the requests.
    return sbManager.accept('http_request', baseConnection, httpRequest);
  }

  // Create a sandbox to send the HTTP request to.
  sbManager.createSandboxForBaseConnection(baseConnection, (err) => {
    if (err) {
      console.fatal(`Sandbox creation failed: ${err}`);
      return;
    }
    sbManager.accept('http_request', baseConnection, httpRequest);
  });
};
