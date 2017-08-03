const field = require('../fields');

module.exports = {
  desc: 'Request to reset an account\'s password using reset codes.',
  type: 'object',
  fields: {
    username: field('Username', {
      desc: 'Username of account to reset.',
    }),
    resetCode: {
      type: 'integer',
      desc: 'Reset code sent to account\'s email address.',
      minValue: 1000,
    },
    newPassword: field('ClearPassword', {
      desc: 'New password for user account.',
    }),
  },
};
