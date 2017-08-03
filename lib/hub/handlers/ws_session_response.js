module.exports = function onWsSessionResponse(clientId, sessionResponse) {
  this.deps.Server.accept('ws_session_response', clientId, sessionResponse);
};
