const _ = require('lodash'),
  ClassMethods = require('./methods'),
  Spec = require('./SerDe.spec')
  ;

class SerDe {
  init(deps, cb) {
    this.config_ = deps.Config.SerDe;
    return cb(null, this);
  }

  destroy(deps, cb) {
    return cb(null, this);
  }

  isSerDe() {
    return true;
  }
}

// Load class methods into prototype from individual files.
_.extend(SerDe.prototype, ClassMethods);
SerDe.prototype.$spec = Spec;

module.exports = SerDe;
