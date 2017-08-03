module.exports = function onWsRpcResponse(clientId, rpcResponse) {
  this.deps.Server.accept('ws_rpc_response', clientId, rpcResponse);
};
