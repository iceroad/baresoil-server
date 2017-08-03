const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  construct = require('runtype').construct,
  clog = require('../../lib/util/clog').testMode(),
  fakedata = require('../fakedata'),
  harness = require('./harness'),
  json = JSON.stringify
  ;

/* eslint-disable no-undef */
describe('Sysapp: app management', function test() {
  let bsServer, baseConnection, sbDriver, username;

  this.slow(3000);
  this.timeout(6000);

  beforeEach((cb) => {
    harness((err, server, bc, sbd) => {
      if (err) return cb(err);
      bsServer = server;
      baseConnection = bc;
      sbDriver = sbd;

      // Create a user account and login
      username = fakedata.Email();

      async.series([
        cb => sbDriver.invoke_('account.create', {
          username,
          password: 'catscatscats!!!',
        }, cb),
        cb => sbDriver.invoke_('account.login', {
          username,
          password: 'catscatscats!!!',
        }, cb),
      ], cb);
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });

  it('App create, get, delete', (cb) => {
    let appConfig;
    const hostname = fakedata.Hostname();
    async.series([
      // Create app.
      cb => sbDriver.invoke_('app.create', {
        name: 'My App',
        hostname,
      }, (err, ac) => {
        if (err) return cb(err);
        appConfig = ac;
        return cb();
      }),
      // Second attempt using the same hostname should fail.
      cb => sbDriver.invoke_('app.create', {
        name: 'My App 2',
        hostname,
      }, (err) => {
        assert.isOk(err);
        assert.match(err.message, /already registered/i);
        return cb();
      }),
      // Get AppConfig using hostname.
      cb => sbDriver.invoke_('app.get', {
        hostname,
      }, (err, ac) => {
        if (err) return cb(err);
        assert.strictEqual(ac.hostname, hostname);
        appConfig = ac;
        return cb();
      }),
      // Delete the app.
      cb => sbDriver.invoke_('app.delete', {
        appId: appConfig.appId,
      }, cb),
      // Get AppConfig should return sysapp.
      cb => sbDriver.invoke_('app.get', {
        hostname,
      }, (err) => {
        assert.isOk(err);
        assert.match(err.message, /Access denied/i);
        return cb();
      }),
    ], cb);
  });

  xit('App stage, upload, abort, and commit', (cb) => {
    let appConfig;
    const hostname = fakedata.Hostname();
    const fileData = Buffer.from('Testing', 'utf-8');
    const clientFileUpload = construct('FileUploadRequest', {
      component: 'client',
      path: 'inner\\My directory\\index.html',
      data: fileData.toString('base64'),
    });
    const serverFileUpload = construct('FileUploadRequest', {
      component: 'server',
      path: 'index.js',
      data: Buffer.from(`
module.exports = {
  $websocket(sessionRequest, cb) {
    return cb();
  },
  echo(fnArg, cb) {
    return cb(null, fnArg);
  },
};
`, 'utf-8').toString('base64'),
    });
    async.series([
      // Create app.
      cb => sbDriver.invoke_('app.create', {
        name: 'My App',
        hostname,
      }, (err, ac) => {
        if (err) return cb(err);
        appConfig = ac;
        return cb();
      }),
      // Start a deployment stage.
      cb => sbDriver.invoke_('deploy.stage', {
        appId: appConfig.appId,
      }, cb),
      // Attempt to start another deployment stage, expect an error because
      // a stage is already in progress.
      cb => sbDriver.invoke_('deploy.stage', {
        appId: appConfig.appId,
      }, (err) => {
        assert.isOk(err);
        assert.match(err.message, /already in progress/i);
        return cb();
      }),
      // Abort the stage, just for kicks.
      cb => sbDriver.invoke_('deploy.abort', cb),
      // Upload a file to the client-side project, which should fail because
      // we have just aborted the stage.
      cb => sbDriver.invoke_('deploy.upload', clientFileUpload, (err) => {
        assert.isOk(err);
        assert.match(err.message, /no stage/i);
        return cb();
      }),
      // Start a new stage.
      cb => sbDriver.invoke_('deploy.stage', {
        appId: appConfig.appId,
      }, cb),
      // Upload a file to the client-side project, which should now succeed.
      cb => sbDriver.invoke_('deploy.upload', clientFileUpload, (err, fileMetadata) => {
        assert.isNotOk(err);
        assert.strictEqual(fileMetadata.mimeType, 'text/html');
        assert.strictEqual(fileMetadata.size, 7);
        assert.strictEqual(fileMetadata.path, 'inner/My directory/index.html');
        return cb();
      }),
      // Get the current deploy stage contents.
      cb => sbDriver.invoke_('deploy.getStatus', (err, deployStage) => {
        assert.isNotOk(err);
        const clientFiles = deployStage.clientManifest.files;
        const serverFiles = deployStage.serverManifest.files;
        assert.strictEqual(serverFiles.length, 0);
        assert.strictEqual(clientFiles.length, 1);
        assert.strictEqual(clientFiles[0].path, 'inner/My directory/index.html');
        return cb();
      }),
      // Upload a file to the server-side project, which should now succeed.
      cb => sbDriver.invoke_('deploy.upload', serverFileUpload, (err, fileMetadata) => {
        assert.isNotOk(err);
        assert.strictEqual(fileMetadata.mimeType, 'application/javascript');
        assert.strictEqual(fileMetadata.path, 'index.js');
        return cb();
      }),
      // Get the current deploy stage contents.
      cb => sbDriver.invoke_('deploy.getStatus', (err, deployStage) => {
        assert.isNotOk(err);
        const clientFiles = deployStage.clientManifest.files;
        const serverFiles = deployStage.serverManifest.files;
        assert.strictEqual(serverFiles.length, 1);
        assert.strictEqual(clientFiles.length, 1);
        assert.strictEqual(clientFiles[0].path, 'inner/My directory/index.html');
        assert.strictEqual(serverFiles[0].path, 'index.js');
        return cb();
      }),
      // Commit the deployment.
      cb => sbDriver.invoke_('deploy.commit', {
        message: 'Some sort of commit message.',
      }, cb),
      // Get AppConfig using hostname.
      cb => sbDriver.invoke_('app.get', {
        hostname,
      }, (err, ac) => {
        if (err) return cb(err);
        appConfig = ac;
        assert.strictEqual(appConfig.hostname, hostname);
        assert.strictEqual(appConfig.deployments.length, 1);
        return cb();
      }),
      // Retrieve server package blob.
      cb => bsServer.BlobStore.get(baseConnection, {
        appId: appConfig.appId,
        etag: appConfig.deployments[0].serverPackage,
      }, cb),
    ], cb);
  });
});
