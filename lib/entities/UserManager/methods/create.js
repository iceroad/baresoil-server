const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  construct = require('runtype').construct,
  idsafe = require('../../../util/idsafe'),
  json = JSON.stringify,
  PublicError = require('../../../errors/PublicError')
  ;

function create(baseConnection, userCreateRequest, cb) {
  assert(this.isUserManager);
  const metaStore = this.metaStore_;

  // Create a base new uid and UserInfo objects.
  let userInfo, username;
  try {
    username = idsafe(userCreateRequest.username, 254);
    userInfo = construct('UserInfo', {
      name: userCreateRequest.name || username,
      securityEvents: [],
      sessions: [],
      status: 'enabled',
      username,
      verified: false,
    });
  } catch (e) {
    return cb(new PublicError('bad_request', {
      message: `Invalid argument: ${e.message}`,
    }));
  }

  return async.auto({
    //
    // Hash password if it was specified.
    //
    hashedPassword: (cb) => {
      if (!userCreateRequest.password) return cb();
      return this.hashPassword(userCreateRequest.password, cb);
    },

    //
    // Save a UserInfo object to the MetaStore.
    //
    userInfo: ['hashedPassword', (deps, cb) => {
      // Save hashed password if it was computed.
      if (deps.hashedPassword) {
        userInfo.hashedPassword = deps.hashedPassword;
      }

      // Save new user.
      metaStore.execute({
        operation: 'insert',
        table: 'users',
        key: username,
        value: userInfo,
      }, (err, kvMetadata) => {
        if (err) {
          if (err.code === 'conflict' && err.key === username) {
            return cb(new PublicError('conflict', {
              message: 'That username is already registered.',
            }));
          }
          return cb(err);
        }
        userInfo.userId = kvMetadata.id;
        userInfo.username = kvMetadata.key;
        return cb(null, userInfo);
      });
    }],
  }, (err, results) => cb(err, err ? undefined : results.userInfo));
}

module.exports = create;
