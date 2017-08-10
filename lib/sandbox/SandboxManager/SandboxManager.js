const _ = require('lodash'),
  fs = require('fs'),
  fse = require('fs-extra'),
  json = JSON.stringify,
  path = require('path'),
  spawn = require('child_process').spawn,
  temp = require('temp').track(),
  AcceptHandlers = require('./handlers'),
  ClassMethods = require('./methods'),
  EventIO = require('event-io'),
  Spec = require('./SandboxManager.spec')
  ;

class SandboxManager extends EventIO {
  init(deps, cb) {
    this.$schema = Spec; // Sets emit() and accept() runtype schemas.
    this.setAcceptHandlers(AcceptHandlers); // Allows typed accept().
    this.sandboxes_ = {}; // Maps clientID to Sandbox
    this.appManager_ = deps.AppManager;
    this.deps_ = deps;
    this.clientLog_ = deps.EventLog.client.bind(deps.EventLog);
    this.config_ = deps.Config.SandboxManager;
    this.serdeCfg_ = deps.Config.SerDe;
    this.syslibInterface_ = deps.Syslib.getPublicInterface();
    try {
      this.checkSystem();
    } catch (e) {
      return cb(new Error(`SandboxManager system check failed: ${e.message}`));
    }
    return this.prepareSandboxDriver(cb);
  }

  prepareSandboxDriver(cb) {
    // Attempt to un-tar packaged sandbox driver into a temporary directory.
    const pkgPath = path.resolve(__dirname, '../../packaged/SandboxDriver.pkg');
    const sbDriverPath = this.sbDriverPath_ = temp.mkdirSync();
    fs.readFile(pkgPath, (err, sbDriverPkgBuffer) => {
      if (err) return cb(err);
      this.deps_.SerDe.extractArchive(sbDriverPkgBuffer, sbDriverPath, (err) => {
        if (err) return cb(err);
        console.debug(`Extracted SandboxDriver to ${sbDriverPath}`);
        return cb(null, this);
      });
    });
  }

  checkSystem() { }

  spawnSandboxChild(baseConnection, appConfig) {
    const syslibInterface = json(this.syslibInterface_);
    const driverPath = this.getSandboxDriverPath();

    // Create temporary working directory for sandbox.
    const workDir = temp.mkdirSync();
    const spawnArgs = [path.join(driverPath, '_init.js')];
    const spawnOpt = {
      cwd: workDir,
      shell: true,
      stdio: 'pipe',
      env: {
        SERDE_CONFIG: json(this.serdeCfg_),
        BASE_CONNECTION: json(baseConnection),
        SYSLIB_INTERFACE: json(syslibInterface),
        APP_ENV: json(_.get(appConfig, 'sandbox.environment', [])),
      },
    };
    const child = spawn('node', spawnArgs, spawnOpt);
    child.once('exit', () => fse.removeSync(workDir));
    return child;
  }

  getSandboxDriverPath() {
    return this.sbDriverPath_;
  }

  destroy(deps, cb) {
    _.forEach(_.keys(this.sandboxes_), (clientId) => {
      this.destroySandbox(clientId);
    });
    return cb(null, this);
  }

  isSandboxManager() {
    return true;
  }

  getSandboxForClient(clientId) {
    return this.sandboxes_[clientId];
  }
}

_.extend(SandboxManager.prototype, ClassMethods);
SandboxManager.prototype.$spec = Spec;

module.exports = SandboxManager;
