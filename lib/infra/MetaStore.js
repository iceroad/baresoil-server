// Metadata store.
const _ = require('lodash'),
  assert = require('assert'),
  construct = require('runtype').construct,
  digest = require('../util/digest'),
  stablejson = require('json-stable-stringify'),
  PublicError = require('../errors/PublicError')
  ;


class MetaStore {
  init(deps, cb) {
    this.idxPrimary_ = {};
    this.idxUnique_ = {};
    return cb();
  }

  // Validate and apply a series of operations within a transaction.
  execute(ops, cb) {
    assert(_.isFunction(cb), 'require a callback');
    let singleOperation = false;
    if (_.isObject(ops) && !_.isArray(ops)) {
      singleOperation = true;
      ops = [ops]; // Shorthand for a single-element array
    }

    // Validate operations.
    _.forEach(ops, (op, idx) => {
      try {
        this.validateOperation(op);
      } catch (e) {
        return cb(new PublicError('bad_request', {
          message: `Operation ${idx} is invalid: ${e.message}`,
        }));
      }
    });

    // Apply transaction.
    return this.transaction_(ops, (err, items) => {
      if (err) return cb(err);
      return cb(null, singleOperation ? items[0] : items);
    });
  }

  // Core transaction execution function / plugin patch point.
  transaction_(ops, cb) {
    // Check if all ops meet their preconditions before applying transaction.
    let results;
    try {
      _.forEach(ops, op => this.canApplyOp_(op));
      results = _.map(ops, op => this.applyOp_(op));
    } catch (pubErr) {
      return cb(pubErr);
    }
    return cb(null, results);
  }

  // Validate an individual operation in a transaction.
  validateOperation(op) {
    construct('KVOperation', op);
    const hasKey = 'key' in op;
    const hasId = 'id' in op;
    const hasKeyOrId = hasKey || hasId;
    const hasIfVersion = op.ifVersion;
    const hasValue = op.value;
    const opType = op.operation;

    if (opType === 'get') {
      if (!hasKeyOrId) {
        throw new Error('Must specify either "key" or "id" for get operations.');
      }
      if (hasIfVersion) {
        throw new Error('Cannot specify "ifVersion" for get operations.');
      }
      if (hasValue) {
        throw new Error('Cannot specify "value" for get operations.');
      }
    }

    if (opType === 'insert') {
      if (hasIfVersion) {
        throw new Error('Cannot specify "ifVersion" for insert operations.');
      }
      if (!hasValue) {
        throw new Error('Must specify "value" for insert operations.');
      }
    }

    if (opType === 'update') {
      if (!hasKeyOrId) {
        throw new Error('Must specify either "key" or "id" for update operations.');
      }
      if (!hasIfVersion) {
        throw new Error('Must specify "ifVersion" for update operations.');
      }
      if (!hasValue) {
        throw new Error('Must specify updated "value" for update operations.');
      }
    }

    if (opType === 'delete') {
      if (!hasKeyOrId) {
        throw new Error('Must specify either "key" or "id" for delete operations.');
      }
      if (hasIfVersion) {
        throw new Error('Cannot specify "ifVersion" for delete operations.');
      }
      if (hasValue) {
        throw new Error('Cannot specify "value" for delete operations.');
      }
    }
  }

  canApplyOp_(op) {
    const opType = op.operation;
    const table = op.table;
    const id = op.id;
    const key = op.key;
    const tablePri = this.idxPrimary_[table] || {};
    const tableUni = this.idxUnique_[table] || {};

    // For insert operations, check for duplicate unique keys, assuming that
    // a unique primary key will be generated.
    if (opType === 'insert') {
      if (key in tableUni) {
        throw new PublicError('conflict', {
          message: `Key "${key}" already exists in table "${table}".`,
          table,
          key,
        });
      }
      return true;
    }

    // Get operations can always be applied.
    if (opType === 'get') {
      return true;
    }

    // Update operations require that the version in op.ifVersion matches
    // the version currently in the index.
    if (opType === 'update') {
      const record = id ? tablePri[id] : tableUni[key];
      const query = id ? `ID ${id}` : `Key "${key}"`;
      if (!record) {
        throw new PublicError('conflict', {
          message: `Conflict in table "${table}" ${query}.`,
          table,
          key,
          id,
        });
      }
      if (record.version !== op.ifVersion) {
        throw new PublicError('conflict', {
          message: `Conflict in table "${table}" ${query}.`,
          table,
          key,
          id,
        });
      }
      return true;
    }

    // Delete operations require that the key/id being deleted actually exists.
    if (opType === 'delete') {
      const record = id ? tablePri[id] : tableUni[key];
      const query = id ? `ID ${id}` : `Key "${key}"`;
      if (!record) {
        throw new PublicError('not_found', {
          message: `Conflict in table "${table}" ${query}.`,
          table,
          key,
          id,
        });
      }
      return true;
    }

    throw new Error(`Operation ${opType} not implemented.`);
  }

  applyOp_(op) {
    const opType = op.operation;
    const table = op.table;
    const id = op.id;
    const key = op.key;
    const tablePri = this.idxPrimary_[table] = this.idxPrimary_[table] || {};
    const tableUni = this.idxUnique_[table] = this.idxUnique_[table] || {};

    // Generate a stable version identifier based on the JSON representation
    // of the value encoded in UTF-8.
    const value = stablejson(op.value || null);
    const version = digest(value).toString('base64');

    // Generate a base KVPair to return if the operation is successful.
    const kvPair = {
      table,
    };
    if (id) kvPair.id = id;
    if (key) kvPair.key = key;

    // Insert a new row into a table.
    if (opType === 'insert') {
      // Generate a unique primary key.
      const genId = id || _.random(1, Number.MAX_SAFE_INTEGER);

      // Create a KVPair with a serialized JSON value.
      _.merge(kvPair, {
        id: genId,
        key,
        exists: true,
        value,
        version,
        modified: Date.now(),
      });

      // Add references to KVPair to primary and unique indices.
      tablePri[genId] = kvPair;
      tableUni[key] = kvPair;

      // Delete "value" from a clone of KVPair and return.
      const kvMetadata = _.clone(kvPair);
      delete kvMetadata.value;
      return construct('KVPair', kvMetadata);
    }

    // Get a value from a table (no errors on missing key/id).
    if (opType === 'get') {
      const record = id ? tablePri[id] : tableUni[key];
      if (record) {
        _.merge(kvPair, record);
        kvPair.value = JSON.parse(record.value);
      } else {
        kvPair.exists = false;
      }
      return construct('KVPair', kvPair);
    }

    // Conditional update of a key/id. Operation preconditions have
    // already been checked.
    if (opType === 'update') {
      const record = id ? tablePri[id] : tableUni[key];
      _.merge(record, {
        value,
        version,
        modified: Date.now(),
      });

      // Delete "value" from a clone of KVPair and return.
      const kvMetadata = _.clone(record);
      delete kvMetadata.value;
      return construct('KVPair', kvMetadata);
    }

    // Delete of a key/id. Key already exists in table.
    if (opType === 'delete') {
      const record = id ? tablePri[id] : tableUni[key];
      delete tableUni[record.key];
      delete tablePri[record.id];
      kvPair.exists = false;
      kvPair.key = record.key;
      kvPair.id = record.id;
      return construct('KVPair', kvPair);
    }

    throw new Error(`Operation ${opType} not implemented.`);
  }

  destroy(deps, cb) {
    return cb();
  }
}


MetaStore.prototype.$spec = {
  deps: ['Config'],
  config: {
    type: 'object',
    desc: 'Options for a Postgres-based MetaStore implementation.',
    fields: {},
  },
  defaults: {},
};

module.exports = MetaStore;
