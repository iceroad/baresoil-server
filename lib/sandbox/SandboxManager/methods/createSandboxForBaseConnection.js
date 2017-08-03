const async = require('async');

module.exports = function createSandboxForBaseConnection(baseConnection, cb) {
  const appId = baseConnection.appId;
  async.auto({
    appConfig: cb => this.appManager_.get(baseConnection, { appId }, cb),
    appPackage: [
      'appConfig', (deps, cb) => this.appManager_.getAppPackage(deps.appConfig[0], cb)],
    sandbox: ['appConfig', 'appPackage', (deps, cb) => this.createSandbox(
      baseConnection, deps.appConfig[0], deps.appPackage, cb)],
  }, (err, result) => {
    if (err) return cb(err);
    return cb(null, result.sandbox);
  });
};
