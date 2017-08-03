const field = require('../fields');

module.exports = {
  name: 'SyscallResponse',
  desc: 'Response from system API function to system application.',
  type: 'object',
  fields: {
    requestId: field('RequestId'),
    error: {
      desc: 'Error details if the syscall failed.',
      type: 'PublicError',
      optional: true,
    },
    resultsArray: {
      type: 'array',
      desc: 'Syscall evaluation results array, if the syscall succeeded.',
      optional: true,
    },
  },
};
