const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  json = JSON.stringify,
  PublicError = require('../../../errors/PublicError')
  ;


function deleteApp(baseConnection, appDeleteRequest, cb) {
  assert(this.isAppManager);
  const appId = _.toInteger(appDeleteRequest.appId);
  if (!appId || appId < 1000) {
    return cb(new PublicError('bad_request', {
      message: 'Must specify a valid "appId" to delete.',
    }));
  }

  const metaStore = this.metaStore_;
  return async.auto({
    appConfig: (cb) => {
      metaStore.execute([{
        operation: 'get',
        table: 'apps',
        id: appId,
      }], (err, items) => {
        if (err) return cb(err);
        if (!items[0].exists) return cb(new PublicError('not_found'));
        return cb(null, items[0].value);
      });
    },

    userDetach: ['appConfig', (deps, cb) => {
      const appConfig = deps.appConfig;
      const appUsers = _.get(appConfig, 'users', []);
      const userDelinkers = _.map(appUsers, userInfo => (cb) => {
        metaStore.execute([{
          operation: 'get',
          table: 'users',
          id: _.toInteger(userInfo.userId),
        }], (err, items) => {
          if (err) return cb(err);
          if (!items[0].exists) {
            console.warn(`deleteApp(): User ${json(userInfo)} does not exist.`);
            return cb();
          }
          const userApps = _.get(items[0].value, 'apps', []);
          const oldLen = userApps.length;
          userInfo.apps = _.filter(userApps, appLink => appLink.appId !== appId);
          if (oldLen === userInfo.apps.length) {
            // No change.
            return cb();
          }
          return metaStore.execute([{
            operation: 'update',
            table: 'users',
            id: _.toInteger(userInfo.userId),
            ifVersion: items[0].version,
            value: userInfo,
          }], cb);
        });
      });
      return async.parallelLimit(userDelinkers, 3, cb);
    }],

    appDelete: ['userDetach', (deps, cb) => {
      return metaStore.execute([{
        operation: 'delete',
        table: 'apps',
        id: appId,
      }], cb);
    }],

  }, (err, results) => {
    return cb(err, err ? undefined : results.appDelete);
  });
}

module.exports = deleteApp;
