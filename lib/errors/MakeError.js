// Injectable interface for the PublicError class so that plugins and providers
// can create instances of PublicError dynamically.
const PublicError = require('./PublicError');

class MakeError {
  init(deps, cb) {
    return cb();
  }

  destroy(deps, cb) {
    return cb();
  }

  make(...args) {
    return new PublicError(...args);
  }
}

MakeError.prototype.$spec = {};

module.exports = MakeError;
