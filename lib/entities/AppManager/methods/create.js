const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  idsafe = require('../../../util/idsafe'),
  construct = require('runtype').construct,
  PublicError = require('../../../errors/PublicError')
  ;


function create(baseConnection, appCreateRequest, cb) {
  assert(this.isAppManager);
  const metaStore = this.metaStore_;
  const config = this.config_;
  const userId = _.toInteger(appCreateRequest.userId);

  return async.auto({
    //
    // Get UserInfo for app owner, return error in invalid user.
    //
    userInfoItem: cb => metaStore.execute({
      operation: 'get',
      table: 'users',
      id: userId,
    }, (err, item) => {
      if (err) return cb(err);
      if (!item.exists) {
        return cb(new PublicError('not_found', {
          message: 'User does not exist.',
        }));
      }
      return cb(null, item);
    }),

    //
    // Create AppConfig and update UserInfo.
    //
    appConfig: ['userInfoItem', (deps, cb) => {
      // Create AppConfig.
      const appConfig = construct('AppConfig', {
        appId: _.random(1000, Number.MAX_SAFE_INTEGER),
        hostname: idsafe(appCreateRequest.hostname, 255),
        name: (appCreateRequest.name || '').trim(),
        sandbox: {
          containerName: config.SandboxManager.defaultContainer,
          environment: [],
        },
        status: 'enabled',
        users: [
          {
            userId,
            role: 'owner',
          },
        ],
      });
      return cb(null, appConfig);
    }],

    //
    // Update UserInfo.
    //
    newUserInfo: ['userInfoItem', 'appConfig', (deps, cb) => {
      // Update UserInfo.apps.owner with the new AppConfig's appId.
      const appConfig = deps.appConfig;
      const appId = appConfig.appId;
      const userInfo = deps.userInfoItem.value;
      userInfo.apps = userInfo.apps || [];
      userInfo.apps.push({
        appId,
        role: 'owner',
      });
      return cb(null, userInfo);
    }],

    //
    // Execute transaction to create applications.
    //
    transactionResult: ['newUserInfo', 'appConfig', (deps, cb) => {
      const appConfig = deps.appConfig;
      const userInfo = deps.newUserInfo;
      return metaStore.execute([
        {
          operation: 'insert',
          table: 'apps',
          id: appConfig.appId,
          key: appConfig.hostname,
          value: appConfig,
        },
        {
          operation: 'update',
          table: 'users',
          id: userId,
          ifVersion: deps.userInfoItem.version,
          value: userInfo,
        },
      ], cb);
    }],
  }, (err, results) => {
    if (err) {
      if (err.code === 'conflict') {
        return cb(new PublicError('conflict', {
          message: 'That hostname is already registered.',
        }));
      }
      console.error(err);
      return cb(err);
    }
    return cb(null, results.appConfig, results.transactionResult[0].version);
  });
}

module.exports = create;
