const field = require('../fields');

module.exports = {
  name: 'SyscallRequest',
  desc: 'Request from system application to call a system API function.',
  type: 'object',
  fields: {
    requestId: field('RequestId'),
    module: {
      type: 'string',
      desc: 'Syslib module.',
      minLength: 1,
      maxLength: 64,
    },
    function: {
      type: 'string',
      desc: 'Function path within syslib module.',
      minLength: 1,
      maxLength: 128,
    },
    argsArray: {
      type: 'any',
      desc: 'Function arguments list.',
    },
  },
};
