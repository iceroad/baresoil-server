const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  clog = require('../../lib/util/clog').testMode(),
  crypto = require('crypto'),
  fakedata = require('../fakedata'),
  json = JSON.stringify,
  sinon = require('sinon'),
  BaresoilServer = require('../../lib/BaresoilServer'),
  TestConfig = require('../config.json')
  ;

/* eslint-disable no-undef */
describe('AppManager: create, update, get, delete apps', function test() {
  let bsServer, appManager, baseConnection, user, userId, hostname;

  this.slow(3000);
  this.timeout(6000);

  beforeEach((cb) => {
    baseConnection = fakedata.BaseConnection(1);
    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    sinon.stub(bsServer.Hub, 'init').yields();
    sinon.stub(bsServer.SandboxManager, 'init').yields();
    sinon.stub(bsServer.Server, 'init').yields();
    appManager = bsServer.AppManager;
    bsServer.init((err) => {
      if (err) return cb(err);
      bsServer.UserManager.create(baseConnection, {
        username: fakedata.Email(),
        password: 'catscatscats!!!',
      }, (err, userInfo) => {
        if (err) return cb(err);
        user = userInfo;
        userId = user.userId;
        hostname = fakedata.RandomString(40);
        return cb();
      });
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });


  it('should create a new app at an unassigned hostname and retrieve it', (cb) => {
    let appConfigSaved;
    async.series([
      // Create new app.
      cb => appManager.create(baseConnection, {
        hostname,
        name: 'Test app',
        userId,
      }, (err, appConfig) => {
        assert.isNotOk(err);
        assert.isOk(appConfig);
        appConfigSaved = JSON.parse(JSON.stringify(appConfig));
        return cb();
      }),

      // Retrieve app by hostname.
      cb => appManager.get(baseConnection, {
        hostname,
      }, (err, appConfig) => {
        assert.isNotOk(err);
        assert.deepEqual(appConfig, appConfigSaved);
        return cb();
      }),

      // Retrieve app by appId.
      cb => appManager.get(baseConnection, {
        appId: appConfigSaved.appId,
      }, (err, appConfig) => {
        assert.isNotOk(err);
        assert.deepEqual(appConfig, appConfigSaved);
        return cb();
      }),

      // Ensure wrong hostname resolves to sysapp.
      cb => appManager.get(baseConnection, {
        appId: appConfigSaved.appId + 1,
      }, (err, appConfig) => {
        assert.isNotOk(err);
        assert.strictEqual(appConfig.appId, 1);
        return cb();
      }),
    ], cb);
  });

  it('should not allow the same hostname to be double-registered', (cb) => {
    async.series([
      // Create new app.
      cb => appManager.create(baseConnection, {
        name: 'Test app',
        hostname,
        userId,
      }, cb),
      // Attempt to create a new app at the same hostname
      cb => appManager.create(baseConnection, {
        name: 'Another app',
        hostname,
        userId,
      }, (err) => {
        assert.isOk(err);
        assert.strictEqual(err.code, 'conflict');
        return cb();
      }),
    ], cb);
  });

  it('should conditionally update app configuration', (cb) => {
    let initialConfig, initialVersion;
    async.series([
      // Create new app.
      cb => appManager.create(baseConnection, {
        name: 'Test app',
        hostname,
        userId,
      }, cb),
      // Retrieve app.
      cb => appManager.get(baseConnection, { hostname }, (err, appConfig, configVersion) => {
        assert.isNotOk(err);
        initialConfig = appConfig;
        initialVersion = configVersion;
        return cb();
      }),
      // Make an update.
      (cb) => {
        const newConfig = _.cloneDeep(initialConfig);
        newConfig.name = 'New name for app';
        appManager.update(baseConnection, newConfig, initialVersion,
            (err, newAppConfig, newVersion) => {
              assert.isNotOk(err);
              assert.isOk(newVersion !== initialVersion);
              return cb();
            });
      },
      // Make an update using initialConfig and initialVersion, which should now fail.
      (cb) => {
        initialConfig.name = 'A different name';
        appManager.update(baseConnection, initialConfig, initialVersion, (err) => {
          assert.isOk(err);
          assert.strictEqual(err.code, 'conflict');
          return cb();
        });
      },
    ], cb);
  });
});
