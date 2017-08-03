const field = require('../fields');

module.exports = {
  type: 'object',
  name: 'RpcResponse',
  desc: 'Result of invoking a server-side handler function.',
  fields: {
    requestId: field('RequestId'),
    error: {
      type: 'PublicError',
      optional: true,
    },
    result: {
      type: 'any',
      optional: true,
    },
  },
};
