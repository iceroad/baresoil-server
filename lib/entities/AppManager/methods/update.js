const assert = require('assert'),
  PublicError = require('../../../errors/PublicError')
;

function update(baseConnection, appConfig, oldVersion, cb) {
  assert(this.isAppManager);
  return this.metaStore_.execute({
    operation: 'update',
    table: 'apps',
    id: appConfig.appId,
    key: appConfig.hostname,
    ifVersion: oldVersion,
    value: appConfig,
  }, (err, item) => {
    if (err || !item.exists) {
      if (err.code === 'conflict' || (item && !item.exists)) {
        return cb(new PublicError('conflict', {
          message: 'Concurrent update detected, please refresh key.',
        }));
      }
      console.error(err);
      return cb(err);
    }
    return cb(null, appConfig, item.version);
  });
}

module.exports = update;
