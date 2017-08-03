const _ = require('lodash');


function textBuffer(inStr) {
  return Buffer.from(inStr, 'utf-8').toString('base64');
}


module.exports = {
  $websocket(sessionRequest, cb) {
    if (sessionRequest.userData) {
      return this.syscall('UserManager', 'authorize', sessionRequest.userData, (err, userSession) => {
        if (err) {
          delete this.$session;
          return cb(err);
        }

        // Save user session and load authenticated API.
        this.$session = userSession;
        _.extend(this.userModule_, require('./api/authenticated'));

        return cb(err, userSession);
      });
    }
    return cb(); // Allow all WebSocket connections with the unauthenticated API.
  },

  $http(httpRequest, cb) {
    return cb(null, {
      requestId: httpRequest.requestId,
      statusCode: 403,
      body: textBuffer(`HTTP ${httpRequest.method} requests forbidden to this domains.`),
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
};
