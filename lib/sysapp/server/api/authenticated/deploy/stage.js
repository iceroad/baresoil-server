const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  tar = require('tar'),
  temp = require('temp'),
  PublicError = require('../../../errors/PublicError')
  ;

function stage(stageRequest, cb) {
  assert(this.$session);
  const userId = this.$session.userId;

  //
  // Only one deploy staged at a time per connection.
  //
  if (this.$stage) {
    return cb(new Error('A deploy stage is already in progress.'));
  }

  //
  // Create stage for deployment.
  //
  const stage = this.$stage = {
    appId: stageRequest.appId,
    ready: false,
    stageRequest,
  };

  return async.auto({
    appConfig: (cb) => {
      this.syscall('AppManager', 'get', {
        appId: stageRequest.appId,
      }, cb);
    },
    pushPermission: ['appConfig', (deps, cb) => {
      const appConfig = deps.appConfig[0];
      const hasPushPermission = _.find(appConfig.users, (user) => {
        return user.userId === userId && (
          user.role === 'owner' ||
          user.role === 'pusher');
      });
      if (!hasPushPermission) {
        return cb(new PublicError('forbidden', {
          message: 'You do not have permission to push to that application.',
        }));
      }
      return cb(null, true);
    }],
    stageDir: ['pushPermission', (deps, cb) => {
      return temp.mkdir('stage', cb);
    }],
    clientManifest: ['stageDir', (deps, cb) => {
      const appConfig = deps.appConfig[0];
      const currentDeployment = _.first(_.get(appConfig, 'deployments'));
      if (!currentDeployment) {
        return cb(null, {
          files: [],
        });
      }
      const clientManifestId = currentDeployment.clientManifest;
      return this.syscall('BlobStore', 'get', {
        appId: stageRequest.appId,
        etag: clientManifestId,
      }, (err, blobData) => {
        if (err) return cb(err);
        return cb(null, JSON.parse(Buffer.from(blobData, 'base64').toString('utf-8')));
      });
    }],
    serverManifest: ['stageDir', (deps, cb) => {
      const appConfig = deps.appConfig[0];
      const currentDeployment = _.first(_.get(appConfig, 'deployments'));
      if (!currentDeployment) {
        return cb(null, {
          files: [],
        });
      }
      const serverManifestId = currentDeployment.serverManifest;
      return this.syscall('BlobStore', 'get', {
        appId: stageRequest.appId,
        etag: serverManifestId,
      }, (err, blobData) => {
        if (err) return cb(err);
        return cb(null, JSON.parse(Buffer.from(blobData, 'base64').toString('utf-8')));
      });
    }],
    serverPackage: ['stageDir', (deps, cb) => {
      const appConfig = deps.appConfig[0];
      const currentDeployment = _.first(_.get(appConfig, 'deployments'));
      if (!currentDeployment) {
        return cb();
      }
      const serverPackageId = currentDeployment.serverPackage;
      return this.syscall('BlobStore', 'get', {
        appId: stageRequest.appId,
        etag: serverPackageId,
      }, (err, blobData) => {
        if (err) return cb(err);
        const tarball = Buffer.from(blobData, 'base64');
        const tarOpt = {
          gzip: true,
          cwd: deps.stageDir,
        };
        return tar.extract(tarOpt).once('close', () => cb()).end(tarball);
      });
    }],
  }, (err, results) => {
    if (err) return cb(err);
    stage.stageDir = results.stageDir;
    stage.appConfig = results.appConfig[0];
    stage.appConfigVersion = results.appConfig[1];
    stage.ready = true;
    stage.clientManifestIdx = _.keyBy(results.clientManifest.files, 'path');
    stage.serverManifestIdx = _.keyBy(results.serverManifest.files, 'path');
    return cb(null, {
      clientManifest: results.clientManifest,
      serverManifest: results.serverManifest,
    });
  });
}

stage.$schema = {
  arguments: [{ type: 'AppStageRequest' }],
  callbackResult: [{ type: 'DeployStage' }],
};

module.exports = stage;
