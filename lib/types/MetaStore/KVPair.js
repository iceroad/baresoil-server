const fields = require('./fields');

const optional = true;

module.exports = {
  name: 'KVPair',
  desc: 'Snapshot of a key-value pair stored in the MetaStore.',
  type: 'object',
  fields: {
    table: fields('Table'),
    exists: fields('Exists'),
    id: fields('Id', { optional }),
    key: fields('Key', { optional }),
    value: fields('Value', { optional }),
    version: fields('Version', { optional }),
    modified: fields('Modified', { optional }),
  },
};
