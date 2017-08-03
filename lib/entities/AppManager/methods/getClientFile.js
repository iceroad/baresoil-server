const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  url = require('url'),
  PublicError = require('../../../errors/PublicError')
  ;

module.exports = function getClientFile(baseConnection, httpRequest, cb) {
  assert(this.isAppManager());

  // Parse and URL-decode request URL.
  let reqUrl = httpRequest.url || '/';
  if (reqUrl.match(/\/$/)) {
    reqUrl += 'index.html';
  }
  const parsedUrl = url.parse(reqUrl);
  const urlPath = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, '');

  // Look in the in-memory sysapp distribution for sysapp files.
  if (baseConnection.appId === 1) {
    const serveFile = this.sysappWebroot_[urlPath];
    if (!serveFile) {
      return cb(new PublicError('not_found'));
    }
    return cb(null, serveFile);
  }

  async.auto({
    appConfigPair: cb => this.get(baseConnection, { appId: baseConnection.appId }, cb),

    // Get client distribution manifest.
    clientManifest: ['appConfigPair', (deps, cb) => {
      const appConfig = deps.appConfigPair[0];
      const deployments = appConfig.deployments;
      if (!deployments || !deployments.length) {
        return cb(new PublicError('not_found', {
          message: 'That app has not been deployed yet.',
        }));
      }
      const latest = deployments[0];
      if (!latest.clientManifest) {
        return cb(new PublicError('not_found', {
          message: 'That app does not support web visitors.',
        }));
      }
      this.deps_.BlobStore.get(baseConnection, {
        appId: appConfig.appId,
        etag: latest.clientManifest,
      }, (err, base64Blob) => {
        if (err) return cb(err);
        const manifest = JSON.parse(Buffer.from(base64Blob, 'base64').toString('utf-8'));
        return cb(null, manifest || {});
      });
    }],

    // Find file in manifest or return 404.
    fileMetadata: ['clientManifest', (deps, cb) => {
      const clientManifest = deps.clientManifest;
      const fileMetadata = _.find(clientManifest.files, (manifestItem) => {
        return manifestItem.path === urlPath;
      });
      if (!fileMetadata) {
        return cb(new PublicError('not_found', {
          message: 'URL not found.',
        }));
      }
      return cb(null, fileMetadata);
    }],

    // Retrieve file blob as Base64 string.
    fileBlob: ['fileMetadata', (deps, cb) => {
      const blobEtag = deps.fileMetadata.etag;
      this.deps_.BlobStore.get(baseConnection, {
        appId: deps.appConfigPair[0].appId,
        etag: blobEtag,
      }, cb);
    }],
  }, (err, result) => {
    if (err || !result.fileMetadata) {
      if (!err.isPublicError) {
        console.error(err);
        err = new PublicError('internal');
      }
    }
    return cb(err, err ? undefined : result);
  });
};
