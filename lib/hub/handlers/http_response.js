module.exports = function onHttpResponse(clientId, httpResponse) {
  this.deps.Server.accept('http_response', clientId, httpResponse);
};
