const _ = require('lodash');

function login(ulRequest, cb) {
  this.syscall('UserManager', 'login', ulRequest, (err, userSession) => {
    if (err) {
      delete this.$session;
      return cb(err);
    }

    // Save user session and load authenticated API.
    this.$session = userSession;
    _.extend(this.userModule_, require('../../authenticated'));

    return cb(err, userSession);
  });
}

login.$schema = {
  arguments: [{ type: 'UserLoginRequest' }],
  callbackResult: [{ type: 'UserSession' }],
};

module.exports = login;
