const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  clog = require('../../lib/util/clog').testMode(),
  crypto = require('crypto'),
  fstate = require('../../lib/util/fstate'),
  json = JSON.stringify,
  sinon = require('sinon'),
  path = require('path'),
  temp = require('temp').track(),
  BaresoilServer = require('../../lib/BaresoilServer'),
  PublicError = require('../../lib/errors/PublicError'),
  TestConfig = require('../config.json')
  ;

const TEST_PROJECTS_DIR = path.resolve(__dirname, '../test_projects');

/* eslint no-undef: "ignore" */
describe('SerDe: archive creation and extraction', function () {
  let bsServer, config, serde;

  this.slow(1000);
  this.timeout(3000);

  beforeEach((cb) => {
    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    sinon.stub(bsServer.Server, 'init').yields();
    sinon.stub(bsServer.Server, 'listen').yields();
    sinon.stub(bsServer.Hub, 'init').yields();
    bsServer.init((err, results) => {
      if (err) return cb(err);
      config = results.Config.SerDe;
      serde = bsServer.SerDe;
      return cb();
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });


  it('should return an error on unavailable native tar', (cb) => {
    config.useNativeTar = true;
    config.nativeTarPath = '/junk/invalid';
    const projPath = path.join(TEST_PROJECTS_DIR, 'minimal');
    serde.createArchive(projPath, (err, tarball) => {
      assert.isOk(err);
      assert.match(err.message, /cannot start tar/i);
      serde.extractArchive(crypto.randomBytes(1024), projPath, (err, tarball) => {
        assert.isOk(err);
        assert.match(err.message, /cannot start tar/i);
        return cb();
      });
    });
  });


  it('should return an error on unextractable archives', (cb) => {
    const tempPath = temp.mkdirSync();
    const junkBuffer = crypto.randomBytes(10 * 1024);
    serde.extractArchive(junkBuffer, tempPath, (err) => {
      assert.isOk(err);
      assert.match(err.message, /could not extract archive/i);

      config.useNativeTar = false;
      serde.extractArchive(junkBuffer, tempPath, (err) => {
        assert.isOk(err);
        assert.match(err.message, /could not extract archive/i);
        return cb();
      });
    });
  });


  it('should create archives using the default tar option', (cb) => {
    let inTarball, inListing;
    const projPath = path.join(TEST_PROJECTS_DIR, 'minimal');
    const tempPath = temp.mkdirSync();
    async.series([
      // Create archive
      (cb) => {
        serde.createArchive(projPath, (err, tarball) => {
          if (err) return cb(err);
          assert(Buffer.isBuffer(tarball));
          assert.isAbove(tarball.length, 1024);
          inTarball = tarball;
          return cb();
        });
      },

      // Get original directory listing.
      (cb) => {
        fstate(projPath, (err, files) => {
          if (err) return cb(err);
          inListing = _.map(files, (fileInfo) => {
            delete fileInfo.absPath;
            delete fileInfo.mtime;
            return fileInfo;
          });
          return cb();
        });
      },

      // Untar into temporary directory.
      (cb) => {
        serde.extractArchive(inTarball, tempPath, cb);
      },

      // Get extracted directory listing.
      (cb) => {
        fstate(tempPath, (err, files) => {
          if (err) return cb(err);
          const outListing = _.map(files, (fileInfo) => {
            delete fileInfo.absPath;
            delete fileInfo.mtime;
            return fileInfo;
          });
          assert.deepEqual(inListing, outListing);
          return cb();
        });
      },
    ], cb);
  });


  it('should create archives using the node-tar option', (cb) => {
    config.useNativeTar = false;

    let inTarball, inListing;
    const projPath = path.join(TEST_PROJECTS_DIR, 'minimal');
    const tempPath = temp.mkdirSync();
    async.series([
      // Create archive
      (cb) => {
        serde.createArchive(projPath, (err, tarball) => {
          if (err) return cb(err);
          assert(Buffer.isBuffer(tarball));
          assert.isAbove(tarball.length, 1024);
          inTarball = tarball;
          return cb();
        });
      },

      // Get original directory listing.
      (cb) => {
        fstate(projPath, (err, files) => {
          if (err) return cb(err);
          inListing = _.map(files, (fileInfo) => {
            delete fileInfo.absPath;
            delete fileInfo.mtime;
            return fileInfo;
          });
          return cb();
        });
      },

      // Untar into temporary directory.
      (cb) => {
        serde.extractArchive(inTarball, tempPath, cb);
      },

      // Get extracted directory listing.
      (cb) => {
        fstate(tempPath, (err, files) => {
          if (err) return cb(err);
          const outListing = _.map(files, (fileInfo) => {
            delete fileInfo.absPath;
            delete fileInfo.mtime;
            return fileInfo;
          });
          assert.deepEqual(inListing, outListing);
          return cb();
        });
      },
    ], cb);
  });

});
