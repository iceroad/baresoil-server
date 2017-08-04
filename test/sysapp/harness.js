const _ = require('lodash'),
  fakedata = require('../fakedata'),
  json = JSON.stringify,
  sinon = require('sinon'),
  BaresoilServer = require('../../lib/BaresoilServer'),
  SandboxDriver = require('../../lib/sandbox/SandboxDriver/SandboxDriver'),
  Sysapp = require('../../lib/sysapp/server'),
  TestConfig = require('../config.json')
  ;


module.exports = function harness(cb) {
  const baseConnection = fakedata.BaseConnection(1);
  const sbDriver = new SandboxDriver(_.cloneDeep(Sysapp));
  const bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
  sinon.stub(bsServer.Server, 'init').yields();
  sinon.stub(bsServer.Server, 'listen').yields();
  sinon.stub(bsServer.Hub, 'init').yields();
  sinon.stub(bsServer.SandboxManager, 'init').yields();
  sinon.stub(bsServer.AppManager, 'createSysappPackage').yields();

  sbDriver.on('syscall_request', (...evtArgs) => {
    console.debug(`SandboxDriver: ${json(evtArgs)}`);
    bsServer.Syslib.accept('sb_syscall_request', baseConnection, ...evtArgs);
  });

  bsServer.Syslib.on('sb_syscall_response', (baseConnection, syscallResponse) => {
    console.debug(`Syslib: ${json(syscallResponse)}`);
    sbDriver.accept_(['syscall_response', syscallResponse]);
  });

  bsServer.init((err, results) => {
    if (err) return cb(err);
    const config = results.Config.UserManager;
    config.passwordHash.iterations = 100;
    return cb(null, bsServer, baseConnection, sbDriver);
  });
};
