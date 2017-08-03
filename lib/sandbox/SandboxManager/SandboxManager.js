const _ = require('lodash'),
  fse = require('fs-extra'),
  json = JSON.stringify,
  path = require('path'),
  spawn = require('child_process').spawn,
  temp = require('temp'),
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
    this.clientLog_ = deps.EventLog.client.bind(deps.EventLog);
    this.config_ = deps.Config.SandboxManager;
    this.syslibInterface_ = deps.Syslib.getPublicInterface();
    try {
      this.checkSystem();
    } catch (e) {
      return cb(new Error(`SandboxManager system check failed: ${e.message}`));
    }
    return cb(null, this);
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
    return path.resolve(__dirname, '../SandboxDriver');
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
