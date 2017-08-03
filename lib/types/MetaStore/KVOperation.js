const fields = require('./fields');

const optional = true;

module.exports = {
  name: 'KVOperation',
  desc: 'Individual operation in a MetaStore transaction.',
  type: 'object',
  fields: {
    operation: fields('Operation'),
    table: fields('Table'),
    id: fields('Id', { optional }),
    key: fields('Key', { optional }),
    value: fields('Value', { optional }),
    ifVersion: fields('Version', {
      optional,
      desc: 'For update operations, the old version identifier to ensure.',
    }),
  },
};
