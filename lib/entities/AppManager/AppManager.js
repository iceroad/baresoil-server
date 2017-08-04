const _ = require('lodash'),
  async = require('async'),
  construct = require('runtype').construct,
  fs = require('fs'),
  json = JSON.stringify,
  path = require('path'),
  makeWebDistribution = require('../../util/makeWebDistribution'),
  ClassMethods = require('./methods'),
  Spec = require('./AppManager.spec')
  ;


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
    async.parallel([
      // Load packaged server tarball.
      (cb) => {
        if (this.config_.AppManager.sysAppServerPath)  {
          // Custom sysapp server.
          const sysAppServerPath = this.config_.AppManager.sysAppServerPath;
          this.deps_.SerDe.createArchive(sysAppServerPath, (err, tarball) => {
            if (err) return cb(err);
            this.sysappPackage_ = tarball;
            return cb();
          });
        } else {
          // Load default (packaged) version.
          const sysAppServerPath = path.resolve(__dirname, '../../packaged/SysappServer.pkg');
          fs.readFile(sysAppServerPath, (err, tarball) => {
            if (err) return cb(err);
            this.sysappPackage_ = tarball;
            return cb();
          });
        }
      },

      // Create in-memory client distribution map.
      (cb) => {
        const sysAppClientPath = (
          this.config_.AppManager.sysAppClientPath ||
          path.resolve(__dirname, '../../sysapp/client'));

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
