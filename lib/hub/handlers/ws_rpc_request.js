module.exports = function onWsRpcRequest(clientId, rpcRequest) {
  this.deps.SandboxManager.accept('ws_rpc_request', clientId, rpcRequest);
};
