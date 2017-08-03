module.exports = function onRpcRequest(baseConnection, sessionRequest) {
  try {
    this.writeToSandbox(baseConnection.clientId, ['session_request', sessionRequest]);
  } catch (e) {
    console.debug(`Cannot write to sandbox: ${e}`);
  }
};
