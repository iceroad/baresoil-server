const _ = require('lodash'),
  assert = require('assert')
;

const Exists = {
  type: 'boolean',
  desc: 'Whether the key/id currently exists in the MetaStore.',
};

const Id = {
  type: 'integer',
  desc: 'Primary key (numeric).',
  minValue: 0,
  maxValue: Number.MAX_SAFE_INTEGER,
};

const Key = {
  type: 'string',
  desc: 'Unique key (string).',
  maxLength: 256,
};

const Modified = {
  type: 'epoch_timestamp_ms',
  desc: 'Time the key/id was last modified.',
};

const Operation = {
  type: 'factor',
  desc: 'Type of operation.',
  factors: ['get', 'insert', 'update', 'delete'],
};

const Table = {
  type: 'string',
  desc: 'Table name.',
  minLength: 1,
  maxLength: 64,
};

const Value = {
  type: 'any',
  desc: 'Value.',
};

const Version = {
  type: 'string',
  desc: 'Version identifier for the current value.',
};

const Fields = {
  Exists,
  Id,
  Key,
  Modified,
  Operation,
  Table,
  Value,
  Version,
};

module.exports = function field(fieldName, overrides) {
  assert(Fields[fieldName], `Cannot find field ${fieldName}.`);
  return _.merge(_.cloneDeep(Fields[fieldName]), overrides);
};
