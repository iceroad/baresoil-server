/* eslint-disable global-require */
const _ = require('lodash');

function logout(ignored, cb) {
  if (!this.$session) return cb(new Error('Not logged in.'));
  this.syscall('UserManager', 'logout', this.$session, (err) => {
    delete this.$session;
    _.extend(this.userModule_, require('../../unauthenticated'));
    return cb(err);
  });
}

logout.$schema = {
  arguments: [{ type: 'any' }],
  callbackResult: [],
};

module.exports = logout;
