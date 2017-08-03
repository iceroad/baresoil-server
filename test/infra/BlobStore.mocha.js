const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  clog = require('../../lib/util/clog').testMode(),
  digest = require('../../lib/util/digest'),
  fakedata = require('../fakedata'),
  json = JSON.stringify,
  sinon = require('sinon'),
  BaresoilServer = require('../../lib/BaresoilServer'),
  TestConfig = require('../config.json')
  ;

/* eslint-disable no-undef */
describe('BlobStore: immutable, content-hased, blob storage', function test() {
  let baseConnection, bsServer, blobStore, content, contentHash;

  this.slow(3000);
  this.timeout(6000);

  beforeEach((cb) => {
    baseConnection = fakedata.BaseConnection();
    content = fakedata.RandomString(100);
    contentHash = digest(content, 'base64');
    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    sinon.stub(bsServer.Server, 'init').yields();
    sinon.stub(bsServer.Hub, 'init').yields();
    sinon.stub(bsServer.SandboxManager, 'init').yields();
    sinon.stub(bsServer.UserManager, 'init').yields();
    sinon.stub(bsServer.MetaStore, 'init').yields();
    sinon.stub(bsServer.AppManager, 'init').yields();
    blobStore = bsServer.BlobStore;
    bsServer.init(cb);
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });


  it('put-then-get should return original blob', (cb) => {
    async.series([
      // Save the blob to the BlobStore.
      cb => blobStore.put(baseConnection, {
        appId: baseConnection.appId,
        etag: contentHash,
        data: content,
      }, cb),

      // Retrieve the blob.
      cb => blobStore.get(baseConnection, {
        appId: baseConnection.appId,
        etag: contentHash,
      }, (err, blobData) => {
        assert.isNotOk(err);
        assert.strictEqual(blobData, content);
        return cb();
      }),
    ], cb);
  });


  it('getting a non-existent blobId should return an error', (cb) => {
    blobStore.get(baseConnection, {
      appId: baseConnection.appId,
      etag: contentHash,
    }, (err, blobData) => {
      assert.isOk(err, 'should return an error.');
      assert.strictEqual(err.code, 'not_found');
      assert.isUndefined(blobData, 'should not return data');
      return cb();
    });
  });


  it('double PUTs should not return errors', (cb) => {
    async.series([
      // First put.
      cb => blobStore.put(baseConnection, {
        appId: baseConnection.appId,
        etag: contentHash,
        data: content,
      }, cb),

      // Second identical put.
      cb => blobStore.put(baseConnection, {
        appId: baseConnection.appId,
        etag: contentHash,
        data: content,
      }, cb),

      // Retrieve to ensure blob was saved.
      cb => blobStore.get(baseConnection, {
        appId: baseConnection.appId,
        etag: contentHash,
      }, (err, blobData) => {
        assert.isNotOk(err);
        assert.strictEqual(blobData, content);
        return cb(err);
      }),
    ], cb);
  });


  it('blobs should be partitioned by app ID', (cb) => {
    const appId2 = baseConnection.appId + 1;

    async.series([
      // First put for app ID 1.
      cb => blobStore.put(baseConnection, {
        appId: baseConnection.appId,
        etag: contentHash,
        data: content,
      }, cb),

      // Ensure app ID 2 does not see the blob.
      cb => blobStore.get(baseConnection, {
        appId: appId2,
        etag: contentHash,
      }, (err) => {
        assert.isOk(err);
        assert.strictEqual(err.code, 'not_found');
        return cb();
      }),

      // Retrieve for app ID 1.
      cb => blobStore.get(baseConnection, {
        appId: baseConnection.appId,
        etag: contentHash,
      }, (err, blobData) => {
        assert.isNotOk(err);
        assert.strictEqual(blobData, content);
        return cb(err);
      }),
    ], cb);
  });
});
