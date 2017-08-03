const _ = require('lodash'),
  ClassMethods = require('./methods'),
  Spec = require('./UserManager.spec')
  ;


class UserManager {
  init(deps, cb) {
    this.config_ = deps.Config.UserManager;
    this.metaStore_ = deps.MetaStore;
    return cb(null, this);
  }

  destroy(deps, cb) {
    return cb(null, this);
  }

  isUserManager() {
    return true;
  }
}

// Load class methods into prototype from individual files.
_.extend(UserManager.prototype, ClassMethods);
UserManager.prototype.$spec = Spec;

module.exports = UserManager;
