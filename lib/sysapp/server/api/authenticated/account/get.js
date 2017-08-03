const _ = require('lodash'),
  assert = require('assert')
;

// Get logged-in user information.
function get(ignored, cb) {
  assert(this.$session);
  const ugRequest = {
    userId: this.$session.userId,
  };
  this.syscall('UserManager', 'get', ugRequest, (err, userInfo, curVersion) => {
    if (err) return cb(err);

    // Strip security-sensitive information.
    delete userInfo.hashedPassword;
    _.forEach(userInfo.securityEvents, (secEvt) => {
      if (secEvt.eventType === 'password_reset_requested') {
        delete secEvt.data.resetCode;
      }
    });

    return cb(null, userInfo, curVersion);
  });
}

get.$schema = {
  arguments: [{ type: 'UserGetRequest' }],
  callbackResult: [{ type: 'UserInfo' }, { type: 'base64_buffer' }],
};

module.exports = get;
