const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  clog = require('../../lib/util/clog').testMode(),
  fakedata = require('../fakedata'),
  json = JSON.stringify,
  sinon = require('sinon'),
  BaresoilServer = require('../../lib/BaresoilServer'),
  TestConfig = require('../config.json')
  ;

/* eslint-disable no-undef */
describe('MetaStore: transactional metadata store', function test() {
  let bsServer, metaStore;
  let testKey, testKey1, testKey2, testKey3;
  let testValue;

  this.slow(3000);
  this.timeout(6000);

  beforeEach((cb) => {
    testKey = fakedata.RandomString(40);
    testKey1 = fakedata.RandomString(40);
    testKey2 = fakedata.RandomString(40);
    testKey3 = fakedata.RandomString(40);
    testValue = {
      nested: 'a test value',
    };

    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    sinon.stub(bsServer.Server, 'init').yields();
    sinon.stub(bsServer.Hub, 'init').yields();
    sinon.stub(bsServer.SandboxManager, 'init').yields();
    sinon.stub(bsServer.UserManager, 'init').yields();
    sinon.stub(bsServer.BlobStore, 'init').yields();
    sinon.stub(bsServer.AppManager, 'init').yields();
    metaStore = bsServer.MetaStore;
    bsServer.init(cb);
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });

  describe('Operation validation', () => {
    it('should reject bad "get" operations.', () => {
      assert.throws(() => metaStore.validateOperation({
        operation: 'get',
        table: 'junk',
      }), /either "key" or "id"/i);

      assert.throws(() => metaStore.validateOperation({
        operation: 'get',
      }), /table/i);
    });


    it('should reject bad "insert" operations.', () => {
      assert.throws(() => metaStore.validateOperation({
        operation: 'insert',
      }), /table/i);

      assert.throws(() => metaStore.validateOperation({
        operation: 'get',
        table: 'junk',
      }), /either "key" or "id"/i);
    });
  });


  describe('Operation semantics', () => {
    it('should insert-then-get a single key/value pair by key', (cb) => {
      const testKey = fakedata.RandomString(40);
      const testValue = {
        nested: 'a test value',
      };
      async.series([
        // Set the test key.
        cb => metaStore.execute({
          operation: 'insert',
          table: 'unit_test',
          key: testKey,
          value: testValue,
        }, cb),

        // Get the test key.
        cb => metaStore.execute({
          operation: 'get',
          table: 'unit_test',
          key: testKey,
        }, (err, item) => {
          if (err) return cb(err);
          assert.isAbove(item.id, 0);
          assert.isOk(item.version);
          assert.strictEqual(item.key, testKey);
          assert.deepEqual(item.value, testValue);
          assert.isOk(item.modified);
          assert.isTrue(item.exists);
          return cb();
        }),
      ], cb);
    });


    it('should insert by key, then get by id', (cb) => {
      const testValue = {
        nested: 'a test value',
      };
      let kvMetadata;
      async.series([
        // Set the test key.
        cb => metaStore.execute({
          operation: 'insert',
          table: 'unit_test',
          key: testKey,
          value: testValue,
        }, (err, metadata) => {
          if (err) return cb(err);
          kvMetadata = metadata;
          return cb();
        }),

        // Get the test key.
        cb => metaStore.execute({
          operation: 'get',
          table: 'unit_test',
          id: kvMetadata.id,
        }, (err, item) => {
          if (err) return cb(err);
          assert.isAbove(item.id, 0);
          assert.isOk(item.version);
          assert.strictEqual(item.key, testKey);
          assert.deepEqual(item.value, testValue);
          assert.isOk(item.modified);
          assert.isTrue(item.exists);
          return cb();
        }),
      ], cb);
    });


    it('should insert by key and explicit id, then get by key', (cb) => {
      const testId = _.random(1, Number.MAX_SAFE_INTEGER);
      async.series([
        // Set the test key with an explicit id.
        cb => metaStore.execute({
          operation: 'insert',
          table: 'unit_test',
          key: testKey,
          id: testId,
          value: testValue,
        }, cb),

        // Get the test key.
        cb => metaStore.execute({
          operation: 'get',
          table: 'unit_test',
          key: testKey,
        }, (err, item) => {
          if (err) return cb(err);
          assert.strictEqual(item.id, testId);
          assert.isOk(item.version);
          assert.strictEqual(item.key, testKey);
          assert.deepEqual(item.value, testValue);
          assert.isOk(item.modified);
          assert.isTrue(item.exists);
          return cb();
        }),
      ], cb);
    });


    it('should delete by key and id', (cb) => {
      let id1;
      async.series([
        // Set the test keys, save an id.
        cb => metaStore.execute([
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey1,
            value: testValue,
          },
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey2,
            value: testValue,
          },
        ], (err, items) => {
          if (err) return cb(err);
          id1 = items[0].id;
          return cb();
        }),

        // Delete the keys, one by key and one by id.
        cb => metaStore.execute([
          {
            operation: 'delete',
            table: 'unit_test',
            key: testKey2,
          },
          {
            operation: 'delete',
            table: 'unit_test',
            id: id1,
          },
        ], cb),

        // Get the test keys, expect missing items (but no error).
        cb => metaStore.execute([
          {
            operation: 'get',
            table: 'unit_test',
            id: id1,
          },
          {
            operation: 'get',
            table: 'unit_test',
            key: testKey1,
          },
          {
            operation: 'get',
            table: 'unit_test',
            key: testKey2,
          },
        ], (err, items) => {
          if (err) return cb(err);
          _.forEach(items, item => assert.isFalse(item.exists));
          return cb();
        }),
      ], cb);
    });


    it('should fail second insert of an existing same key', (cb) => {
      async.series([
        // Insert two of the test keys.
        cb => metaStore.execute([
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey1,
            value: testValue,
          },
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey2,
            value: testValue,
          },
        ], cb),

        // Attempt to re-insert the first test key, expect failure.
        cb => metaStore.execute({
          operation: 'insert',
          table: 'unit_test',
          key: testKey1,
          value: 123,
        }, (err) => {
          assert.isOk(err);
          assert.strictEqual(err.code, 'conflict');
          assert.strictEqual(err.table, 'unit_test');
          assert.strictEqual(err.key, testKey1);
          return cb();
        }),

        // Ensure that first test key has not been modified.
        cb => metaStore.execute({
          operation: 'get',
          table: 'unit_test',
          key: testKey1,
        }, (err, item) => {
          if (err) return cb(err);
          assert.isAbove(item.id, 0);
          assert.isOk(item.version);
          assert.strictEqual(item.key, testKey1);
          assert.deepEqual(item.value, testValue);
          assert.isOk(item.modified);
          assert.isTrue(item.exists);
          return cb();
        }),
      ], cb);
    });


    it('should fail multi-item transactions on unique constraint violations', (cb) => {
      async.series([
        // Insert two of the test keys.
        cb => metaStore.execute([
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey1,
            value: testValue,
          },
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey2,
            value: testValue,
          },
        ], cb),

        // Attempt to insert one existing and one new key in a transaction.
        cb => metaStore.execute([
          {
            // new key
            operation: 'insert',
            table: 'unit_test',
            key: testKey3,
            value: testValue,
          },
          {
            // existing key
            operation: 'insert',
            table: 'unit_test',
            key: testKey1,
            value: 123,
          },
        ], (err) => {
          assert.isOk(err);
          assert.strictEqual(err.code, 'conflict');
          assert.strictEqual(err.table, 'unit_test');
          assert.strictEqual(err.key, testKey1);
          return cb();
        }),

        // Ensure that first test key has not been modified, and third test key
        // is not set because it should have been rolled back.
        cb => metaStore.execute([
          {
            operation: 'get',
            table: 'unit_test',
            key: testKey1,
          },
          {
            operation: 'get',
            table: 'unit_test',
            key: testKey3,
          },
        ], (err, items) => {
          if (err) return cb(err);

          // test key 1: should be unchanged from initial value due to the
          // insert statement rolling back the transaction.
          assert.isTrue(items[0].exists);
          assert.strictEqual(items[0].key, testKey1);
          assert.deepEqual(items[0].value, testValue);

          // test key 3: should not be set because the transaction should have
          // been rolled back due to the insert conflict on testKey1.
          assert.strictEqual(items[1].key, testKey3);
          assert.isFalse(items[1].exists);
          assert.isNotOk(items[1].value);
          return cb();
        }),
      ], cb);
    });


    it('should transactionally update keys that have not been modified', (cb) => {
      const testKey1 = `key1:${fakedata.RandomString(40)}`;
      const testKey2 = `key2:${fakedata.RandomString(40)}`;
      const testValue1 = 'val1';
      const testValue2 = 'val2';
      const testValue3 = 'val3';
      let version1, version2, id2;
      async.series([
        // Set two initial test keys, save their version identifiers.
        cb => metaStore.execute([
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey1,
            value: testValue1,
          },
          {
            operation: 'insert',
            table: 'unit_test',
            key: testKey2,
            value: testValue2,
          },
        ], (err, items) => {
          if (err) return cb(err);
          version1 = items[0].version;
          version2 = items[1].version;
          id2 = items[1].id;
          return cb();
        }),

        // Attempt to update both values, but using the wrong version for the second
        // update using the wrong versions, expect an error.
        cb => metaStore.execute([
          {
            operation: 'update',
            table: 'unit_test',
            key: testKey1,
            ifVersion: version1,
            value: testValue2,
          },
          {
            operation: 'update',
            table: 'unit_test',
            id: id2,
            ifVersion: version1,  // NOTE: version1, the wrong version
            value: testValue2,
          },
        ], (err) => {
          assert.isOk(err);
          assert.strictEqual(err.code, 'conflict');
          assert.strictEqual(err.table, 'unit_test');
          assert.strictEqual(err.id, id2);
          assert.match(err.message, /conflict in table/i);
          return cb();
        }),

        // Update both values using the correct conditional update, one by key
        // and one by primary id.
        cb => metaStore.execute([
          {
            operation: 'update',
            table: 'unit_test',
            key: testKey1,
            ifVersion: version1,
            value: {
              firstKey: testValue3,
              secondKey: 123,
            },
          },
          {
            operation: 'update',
            table: 'unit_test',
            id: id2,
            ifVersion: version2,
            value: {
              secondKey: 123,
              firstKey: testValue3,
            },
          },
        ], cb),

        // Retrieve both keys, ensure that the update succeeded.
        cb => metaStore.execute([
          {
            operation: 'get',
            table: 'unit_test',
            key: testKey1,
          },
          {
            operation: 'get',
            table: 'unit_test',
            key: testKey2,
          },
        ], (err, items) => {
          if (err) return cb(err);

          assert.isTrue(items[0].exists);
          assert.strictEqual(items[0].key, testKey1);
          assert.deepEqual(items[0].value, {
            firstKey: testValue3,
            secondKey: 123,
          });
          assert.notEqual(items[0].version, version1);

          assert.isTrue(items[1].exists);
          assert.strictEqual(items[1].key, testKey2);
          assert.deepEqual(items[1].value, items[0].value);
          assert.notEqual(items[1].version, version2);

          // Since both keys are set to the same value, their versions should
          // be the same.
          assert.strictEqual(items[0].version, items[1].version);

          return cb();
        }),

      ], cb);
    });
  });
});
