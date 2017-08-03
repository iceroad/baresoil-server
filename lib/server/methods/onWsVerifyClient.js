const assert = require('assert');

module.exports = function onWsVerifyClient(info, cb) {
  assert(this.isServer);
  return cb(true);
};
