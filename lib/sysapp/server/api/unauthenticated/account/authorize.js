/* eslint-disable global-require */
const _ = require('lodash');

function authorize(userSession, cb) {
  this.syscall('UserManager', 'authorize', userSession, (err) => {
    if (err) {
      delete this.$session;
      return cb(err);
    }

    // Save user session and load authenticated API.
    this.$session = userSession;
    _.extend(this.getUserModule(), require('../../authenticated'));

    return cb(err);
  });
}

authorize.$schema = {
  arguments: [{ type: 'UserSession' }],
  callbackResult: [],
};

module.exports = authorize;
