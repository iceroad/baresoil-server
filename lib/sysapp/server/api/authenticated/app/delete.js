const _ = require('lodash'),
  assert = require('assert')
;

function deleteApp(adRequest, cb) {
  assert(this.$session);
  const userId = this.$session.userId;
  this.syscall('AppManager', 'get', {
    appId: adRequest.appId,
  }, (err, appConfig) => {
    if (err) return cb(err);

    const hasDeletePermission = _.find(appConfig.users, (user) => {
      return user.userId === userId && user.role === 'owner';
    });
    if (!hasDeletePermission) {
      return cb(new Error(
        'You do not have permission to delete that application.'));
    }

    return this.syscall('AppManager', 'delete', adRequest, err => cb(err));
  });
}

deleteApp.$schema = {
  arguments: [{ type: 'AppDeleteRequest' }],
  callbackResult: [],
};

module.exports = deleteApp;
