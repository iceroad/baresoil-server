module.exports = function onRpcRequest(clientId, rpcRequest) {
  try {
    this.writeToSandbox(clientId, ['rpc_request', rpcRequest]);
  } catch (e) {
    console.debug(`Cannot write to sandbox: ${e}`);
  }
};
