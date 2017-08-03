const _ = require('lodash'),
  async = require('async'),
  construct = require('runtype').construct,
  json = JSON.stringify,
  path = require('path'),
  makeWebDistribution = require('../../util/makeWebDistribution'),
  ClassMethods = require('./methods'),
  Spec = require('./AppManager.spec')
  ;


const DEFAULT_SYSAPP_PATH = path.resolve(__dirname, '../../sysapp');


class AppManager {
  init(deps, cb) {
    this.deps_ = deps;
    this.config_ = deps.Config;
    this.metaStore_ = deps.MetaStore;
    this.makeError_ = deps.MakeError.make;

    // Load sysapp into memory during initialization phase.
    this.sysappWebroot_ = {};
    this.sysappPackage_ = null;
    this.loadSysapp(err => cb(err, this));
  }

  loadSysapp(cb) {
    const sysAppClientPath = (
      this.config_.AppManager.sysAppClientPath ||
      path.join(DEFAULT_SYSAPP_PATH, 'client'));
    const sysAppServerPath = (
      this.config_.AppManager.sysAppServerPath ||
      path.join(DEFAULT_SYSAPP_PATH, 'server'));
    async.parallel([
      // Create server tarball.
      (cb) => {
        this.deps_.SerDe.createArchive(sysAppServerPath, (err, tarball) => {
          if (err) return cb(err);
          this.sysappPackage_ = tarball;
          return cb();
        });
      },

      // Create in-memory client distribution map.
      (cb) => {
        makeWebDistribution(sysAppClientPath, (err, webDistribution) => {
          if (err) return cb(err);
          this.sysappWebroot_ = webDistribution;
          return cb();
        });
      },
    ], cb);
  }

  destroy(deps, cb) {
    return cb(null, this);
  }

  isAppManager() {
    return true;
  }

  getSysappClientFile(relPath) {
    return this.sysappWebroot_[relPath];
  }

}

// Load class methods into prototype from individual files.
_.extend(AppManager.prototype, ClassMethods);
AppManager.prototype.$spec = Spec;

module.exports = AppManager;
