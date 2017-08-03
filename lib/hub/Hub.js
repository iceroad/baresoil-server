const AcceptHandlers = require('./handlers'),
  EventIO = require('event-io'),
  Spec = require('./Hub.spec')
  ;

class Hub extends EventIO {
  init(deps, cb) {
    this.$schema = Spec; // Sets emit() and accept() runtype schemas.
    this.setAcceptHandlers(AcceptHandlers); // Allows typed accept().
    this.deps = deps;
    this.clientLog_ = deps.EventLog.client.bind(deps.EventLog);

    // Accept messages from leaf components.
    deps.SandboxManager.on('*', this.accept.bind(this));
    deps.Server.on('*', this.accept.bind(this));
    deps.Syslib.on('*', this.accept.bind(this));

    return cb(null, this);
  }

  destroy(deps, cb) {
    return cb(null, this);
  }

  isHub() {
    return true;
  }

  getStats() {
    return {
      server: this.deps.Server.getStats(),
    };
  }
}

Hub.prototype.$spec = Spec;

module.exports = Hub;
