const _ = require('lodash'),
  assert = require('assert'),
  PublicError = require('../../../errors/PublicError')
  ;

function update(baseConnection, userInfo, oldVersion, cb) {
  assert(this.isUserManager);

  return this.metaStore_.execute({
    operation: 'update',
    table: 'users',
    id: userInfo.id,
    key: userInfo.username,
    ifVersion: oldVersion,
    value: userInfo,
  }, (err, item) => {
    if (err || !item.exists) {
      if (err.code === 'conflict' || (item && !item.exists)) {
        return cb(new PublicError('conflict', {
          message: 'Concurrent update detected, please refresh key.',
        }));
      }
      return cb(err);
    }

    return cb(null, item.value, item.version);
  });
}

module.exports = update;
