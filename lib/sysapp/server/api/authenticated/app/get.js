const _ = require('lodash'),
  assert = require('assert')
;

function get(agRequest, cb) {
  assert(this.$session);
  const userId = this.$session.userId;
  this.syscall('AppManager', 'get', agRequest, (err, appConfig, curVersion) => {
    if (err) return cb(err);
    const hasGetPermission = _.find(appConfig.users, user => user.userId === userId);
    if (!hasGetPermission) return cb(new Error('Access denied.'));
    return cb(null, appConfig, curVersion);
  });
}

get.$schema = {
  arguments: [{ type: 'AppGetRequest' }],
  callbackResult: [{ type: 'AppConfig' }, { type: 'base64_buffer' }],
};

module.exports = get;
