const assert = require('assert'),
  construct = require('runtype').construct,
  digest = require('../../../util/digest'),
  fs = require('fs'),
  fse = require('fs-extra'),
  mime = require('mime-types'),
  pathutil = require('../../../util/pathutil'),
  path = require('path')
  ;


function UploadToClientComponent(fileData, fileMetadata, cb) {
  assert(Buffer.isBuffer(fileData));
  assert(this.$stage.ready);
  const stage = this.$stage;
  const relPath = fileMetadata.path;

  if (stage.clientManifestIdx[relPath]) {
    if (stage.clientManifestIdx[relPath].etag === fileMetadata.etag) {
      // Exact file already exists in BlobStore, no need to re-upload.
      // Overwrite the manifest item in case the upload has a new modification
      // time or cache settings.
      stage.clientManifestIdx[relPath] = fileMetadata;
      return cb(null, fileMetadata);
    }
  }

  // Upload file data to app blob storage and save manifest item.
  return this.syscall('BlobStore', 'put', construct('BlobPutRequest', {
    appId: stage.appId,
    data: fileData.toString('base64'),
    etag: fileMetadata.etag,
  }), (err) => {
    if (err) return cb(err);
    stage.clientManifestIdx[relPath] = fileMetadata;
    return cb(null, fileMetadata);
  });
}


function UploadToServerComponent(fileData, fileMetadata, cb) {
  assert(Buffer.isBuffer(fileData));
  assert(this.$stage.ready);
  const stage = this.$stage;
  const relPath = fileMetadata.path;

  // Write file to stage package directory.
  const outPath = path.join(stage.stageDir, relPath);
  fse.ensureDirSync(path.dirname(outPath));
  fs.writeFileSync(outPath, fileData);
  stage.serverManifestIdx[relPath] = fileMetadata;
  return cb(null, fileMetadata);
}


function upload(uploadReq, cb) {
  assert(this.$session);
  const stage = this.$stage;
  if (!stage) {
    return cb(new Error('No stage in progress.'));
  }
  if (!stage.ready) {
    return cb(new Error('Stage not ready.'));
  }

  // Generate blob and manifest item out of user upload.
  const reqPath = pathutil.normalizeRelativePath(uploadReq.path);
  if (!reqPath.length) {
    return cb(new Error('Invalid upload path.'));
  }
  const mimeType = mime.lookup(reqPath) || 'application/octet-stream';
  const dataBuffer = Buffer.from(uploadReq.data, 'base64');
  const contentHash = digest(dataBuffer, 'base64');
  const fileMetadata = construct('FileMetadata', {
    path: reqPath,
    mimeType,
    size: dataBuffer.length,
    etag: contentHash,
    lastModified: uploadReq.lastModified || Date.now(),
    cacheMaxAgeSec: uploadReq.cacheMaxAgeSec,
  });

  if (uploadReq.component === 'server') {
    return UploadToServerComponent.call(this, dataBuffer, fileMetadata, cb);
  }
  if (uploadReq.component === 'client') {
    return UploadToClientComponent.call(this, dataBuffer, fileMetadata, cb);
  }
  return cb(new Error('Invalid upload component.'));
}

upload.$schema = {
  arguments: [{ type: 'FileUploadRequest' }],
  callbackResult: [{ type: 'FileMetadata' }],
};


module.exports = upload;
