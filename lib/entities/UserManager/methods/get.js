const _ = require('lodash'),
  assert = require('assert'),
  idsafe = require('../../../util/idsafe'),
  PublicError = require('../../../errors/PublicError')
  ;

function get(baseConnection, userGetRequest, cb) {
  assert(this.isUserManager);

  const username = idsafe(userGetRequest.username, 254);
  const userId = _.toInteger(userGetRequest.userId);
  if (!(username || userId)) {
    return cb(new PublicError('bad_request', {
      message: 'Must specify either username or user ID.',
    }));
  }

  const query = {
    operation: 'get',
    table: 'users',
  };
  if (username) {
    query.key = username;
  } else {
    query.id = userId;
  }

  return this.metaStore_.execute(query, (err, item) => {
    if (err) return cb(err);
    if (!item.exists) {
      return cb(new PublicError('not_found', {
        message: 'User does not exist.',
      }));
    }
    item.value.userId = item.id;
    return cb(null, item.value, item.version);
  });
}

module.exports = get;
