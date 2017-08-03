const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  def = require('runtype').schemaDef,
  fs = require('fs'),
  fse = require('fs-extra'),
  path = require('path'),
  temp = require('temp'),
  os = require('os'),
  PublicError = require('../errors/PublicError')
  ;


class BlobStore {
  init(deps, cb) {
    this.config_ = deps.Config.BlobStore;

    // Ensure that blob storage directory exists and is writeable.
    const dataDir = this.config_.dataDirectory || path.resolve(os.homedir(), 'baresoil_data');
    try {
      fse.ensureDirSync(dataDir);
    } catch (e) {
      return cb(new Error(
        `Cannot create BlobStore data directory "${dataDir}": ${e.message}`));
    }

    // Ensure a subdirectory for temporary writes during flushing.
    this.flushDir_ = path.join(dataDir, 'flush');
    try {
      fse.ensureDirSync(this.flushDir_);
    } catch (e) {
      return cb(new Error(
        `Cannot create BlobStore data directory "${this.flushDir_}": ` +
          `${e.message}`));
    }

    // Ensure subdirectory for permanent storage.
    this.blobDir_ = path.join(dataDir, 'blob');
    try {
      fse.ensureDirSync(this.blobDir_);
    } catch (e) {
      return cb(new Error(
        `Cannot create BlobStore data directory "${this.blobDir_}": ` +
          `${e.message}`));
    }

    return cb();
  }

  destroy(deps, cb) {
    return cb();
  }

  isBlobStore() {
    return true;
  }

  put(baseConnection, blobPutRequest, cb) {
    assert(this.isBlobStore);
    const appId = _.toString(_.toInteger(blobPutRequest.appId));
    const etag = encodeURIComponent(blobPutRequest.etag);

    // Check for blob already existing in permanent blob storage directory.
    const blobPath = path.join(this.blobDir_, appId, etag);
    fs.access(blobPath, fs.constants.R_OK, (err) => {
      if (!err) {
        // Blob exists and is readable, do nothing.
        return cb();
      }

      const buffer = Buffer.from(blobPutRequest.data, 'base64');
      const flushPath = temp.path({ dir: this.flushDir_ });

      return async.series([
        // Ensure app's blob output directory exists.
        cb => fse.ensureDir(path.dirname(blobPath), cb),

        // Flush blob to temporary directory.
        cb => fs.writeFile(flushPath, buffer, cb),

        // Atomic rename from temporary directory to final location.
        cb => fs.rename(flushPath, blobPath, cb),
      ], (err) => {
        if (err) {
          console.error(err);
          return cb(new PublicError('internal', {
            message: 'Cannot write blob to disk.',
          }));
        }
        return cb();
      });
    });
  }

  get(baseConnection, blobGetRequest, cb) {
    assert(this.isBlobStore);
    const appId = _.toString(_.toInteger(blobGetRequest.appId));
    const etag = encodeURIComponent(blobGetRequest.etag);

    // Attempt to read blob from its pre-determined location.
    const blobPath = path.join(this.blobDir_, appId, etag);
    fs.readFile(blobPath, (err, dataBuffer) => {
      if (err) {
        if (err.code !== 'ENOENT') {
          console.error(err);
        }
        return cb(new PublicError('not_found', {
          message: 'Blob not found.',
        }));
      }

      return cb(null, dataBuffer.toString('base64'));
    });
  }
}


BlobStore.prototype.$spec = {
  deps: ['Config'],
  config: {
    type: 'object',
    desc: 'Options for a filesystem-based BlobStore implementation.',
    fields: {
      dataDirectory: {
        type: 'string',
        desc: 'Path to custom blob storage directory.',
        optional: true,
      },
    },
  },
  defaults: {},
  syslib: {
    get: {
      arguments: def.TypedArray([
        def.Type('BlobGetRequest'),
      ]),
    },
    put: {
      arguments: def.TypedArray([
        def.Type('BlobPutRequest'),
      ]),
    },
  },
};


module.exports = BlobStore;
