const field = require('../fields');

module.exports = {
  name: 'RpcRequest',
  desc: 'Request from client to invoke a server-side handler function.',
  type: 'object',
  fields: {
    requestId: field('RequestId'),
    function: {
      type: 'string',
      desc: 'Handler function name or function path.',
      minLength: 1,
      maxLength: 256,
    },
    argument: {
      type: 'any',
      optional: true,
    },
  },
};
