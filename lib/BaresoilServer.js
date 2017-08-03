const _ = require('lodash'),
  cpuUsage = require('./util/cpu-usage'),
  os = require('os'),
  runtype = require('runtype'),
  Injector = require('./inject/Injector'),
  Types = require('./types')
  ;


class BaresoilServer {
  constructor(configOverrides, extraProviders, args) {
    // Load type definitions.
    runtype.loadIntoLibrary(Types);

    // Create injector.
    this.injector_ = new Injector(configOverrides, extraProviders, args);

    // Expose injector's implementation on this object.
    _.extend(this, this.injector_.impl_);
  }

  init(cb) {
    this.injector_.init(cb);
  }

  destroy(cb) {
    this.injector_.destroy(cb);
  }

  health() {
    const rv = {
      uptime: Date.now() - this.startTime_,
      time: Date.now(),
      server: this.Server.getStats(),
      system: {
        cpuUsage: cpuUsage(),
        freeMemPcnt: os.freemem() / os.totalmem(),
      },
    };
    return rv;
  }
}


module.exports = BaresoilServer;
