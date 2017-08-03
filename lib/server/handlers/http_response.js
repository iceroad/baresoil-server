const _ = require('lodash'),
  assert = require('assert')
;

module.exports = function httpSendResponse(clientId, httpResponse) {
  assert(this.isServer());
  const client = this.clients_.httpRequests[clientId];
  if (client) {
    const pendingRequest = client[httpResponse.requestId];
    if (!pendingRequest) {
      console.warn('Not sending response to unknown request.');
      return;
    }

    // Send response.
    const headers = httpResponse.headers || {};
    const body = httpResponse.body ?
      Buffer.from(httpResponse.body, 'base64') : null;
    if (body) {
      headers['Content-Length'] = _.toInteger(body.length);
      delete headers['content-length'];
    }


    try {
      pendingRequest.res.writeHead(httpResponse.statusCode, headers);
      if (body) {
        pendingRequest.res.end(body);
      } else {
        pendingRequest.res.end();
      }
      delete client[httpResponse.requestId];
      this.clientLog_(clientId, 'http_response', `HTTP ${httpResponse.statusCode}`);
    } catch (e) {
      console.error(e);
    }

    if (_.isEmpty(client)) {
      delete this.clients_.httpRequests[clientId];
    }
  }
};
