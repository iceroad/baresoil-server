const assert = require('assert'),
  PublicError = require('../../../errors/PublicError')
;


module.exports = function getAppPackage(appConfig, cb) {
  assert(this.isAppManager());
  assert(appConfig);

  if (appConfig.appId === 1) {
    return cb(null, this.getSysappPackage());
  }

  const deployments = appConfig.deployments;
  if (!deployments || !deployments.length) {
    return cb(new PublicError('not_found', {
      message: 'That app has not been deployed yet.',
    }));
  }
  const latest = deployments[0];
  if (!latest.serverPackage) {
    return cb(new PublicError('not_found', {
      message: 'That app does not support backend connections.',
    }));
  }

  this.deps_.BlobStore.get(null, {
    appId: appConfig.appId,
    etag: latest.serverPackage,
  }, (err, base64Blob) => {
    if (err) return cb(err);
    return cb(null, Buffer.from(base64Blob, 'base64'));
  });
};
