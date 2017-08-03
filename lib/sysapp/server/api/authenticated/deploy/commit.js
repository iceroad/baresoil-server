const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  construct = require('runtype').construct,
  digest = require('../../../util/digest'),
  fs = require('fs'),
  fse = require('fs-extra'),
  json = JSON.stringify,
  path = require('path'),
  stablejson = require('json-stable-stringify'),
  tar = require('tar')
  ;


function commit(commitRequest, cb) {
  assert(this.$session);
  const stage = this.$stage;
  if (!stage) {
    return cb(new Error('No stage in progress.'));
  }
  if (!stage.ready) {
    return cb(new Error('Stage not ready.'));
  }
  const appId = stage.appId;

  return async.auto({
    clientManifestId: (cb) => {
      const clientManifest = construct('FileManifest', {
        files: _.sortBy(_.values(stage.clientManifestIdx), 'path'),
      });
      const manifestBuffer = Buffer.from(stablejson(clientManifest), 'utf-8');
      const manifestId = digest(manifestBuffer, 'base64');
      return this.syscall('BlobStore', 'put', {
        appId,
        data: manifestBuffer.toString('base64'),
        etag: manifestId,
      }, err => cb(err, err ? undefined : manifestId));
    },

    serverManifestId: (cb) => {
      const serverManifest = construct('FileManifest', {
        files: _.sortBy(_.values(stage.serverManifestIdx), 'path'),
      });
      const manifestBuffer = Buffer.from(stablejson(serverManifest), 'utf-8');
      const manifestId = digest(manifestBuffer, 'base64');
      return this.syscall('BlobStore', 'put', {
        appId,
        data: manifestBuffer.toString('base64'),
        etag: manifestId,
      }, err => cb(err, err ? undefined : manifestId));
    },

    serverPackageId: (cb) => {
      if (commitRequest.serverConfig) {
        fs.writeFileSync(
          path.join(stage.stageDir, 'baresoil.json'),
          json({ server: commitRequest.serverConfig }, null, 2),
          'utf-8');
        console.debug('Wrote baresoil.json', commitRequest.serverConfig);
      }
      const tarOpt = {
        gzip: true,
        cwd: stage.stageDir,
        portable: true,
      };
      const tarStream = tar.create(tarOpt, ['.']);
      const chunks = [];
      tarStream.on('data', chunk => chunks.push(chunk));
      return tarStream.on('end', () => {
        const pkgData = Buffer.concat(chunks);
        const pkgId = digest(pkgData, 'base64');
        return this.syscall('BlobStore', 'put', {
          appId,
          data: pkgData.toString('base64'),
          etag: pkgId,
        }, err => cb(err, err ? undefined : pkgId));
      });
    },

    appConfig: ['clientManifestId', 'serverManifestId', 'serverPackageId', (deps, cb) => {
      const appConfig = stage.appConfig;
      appConfig.deployments = appConfig.deployments || [];
      appConfig.deployments.splice(0, 0, construct('AppDeployment', {
        clientManifest: deps.clientManifestId,
        message: commitRequest.message,
        serverManifest: deps.serverManifestId,
        serverPackage: deps.serverPackageId,
        remoteAddress: this.getRemoteAddress(),
        time: Date.now(),
        userId: this.$session.userId,
      }));
      return this.syscall('AppManager', 'update', appConfig, stage.appConfigVersion, cb);
    }],
  }, (err, results) => {
    if (err) return cb(err);
    fse.removeSync(stage.stageDir);
    delete this.$stage;
    return cb();
  });
}

commit.$schema = {
  arguments: [{ type: 'DeployCommitRequest' }],
  callbackResult: [],
};

module.exports = commit;
