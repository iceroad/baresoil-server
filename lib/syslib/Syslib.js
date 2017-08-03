const _ = require('lodash'),
  AcceptHandlers = require('./handlers'),
  EventIO = require('event-io'),
  PublicError = require('../errors/PublicError'),
  Spec = require('./Syslib.spec')
  ;


class Syslib extends EventIO {
  init(deps, cb) {
    this.$schema = Spec; // Sets emit() and accept() runtype schemas.
    this.setAcceptHandlers(AcceptHandlers); // Allows typed accept().
    this.deps = deps;

    // Get syslib interface to export to sysapp sandbox.
    function getInterface(mod) {
      return _.mapValues(mod, () => 1);
    }
    this.syslibInterface_ = {
      AppManager: getInterface(deps.AppManager.$spec.syslib),
      BlobStore: getInterface(deps.BlobStore.$spec.syslib),
      UserManager: getInterface(deps.UserManager.$spec.syslib),
    };
    return cb(null, this);
  }

  destroy(deps, cb) {
    return cb(null, this);
  }

  isSyslib() {
    return true;
  }

  getPublicInterface() {
    return this.syslibInterface_;
  }

  failSyscall(baseConnection, syscallRequest, message) {
    const syscallResponse = {
      requestId: syscallRequest.requestId,
      error: new PublicError('bad_request', {
        message,
      }).toJson(),
    };
    this.emit('sb_syscall_response', baseConnection.clientId, syscallResponse);
  }
}

Syslib.prototype.$spec = Spec;

module.exports = Syslib;
