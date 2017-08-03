module.exports = function onHttpRequest(baseConnection, httpRequest) {
  try {
    this.writeToSandbox(baseConnection.clientId, ['http_request', httpRequest]);
  } catch (e) {
    console.debug(`Cannot write to sandbox: ${e}`);
  }
};
