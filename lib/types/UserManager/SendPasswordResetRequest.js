const field = require('../fields');

module.exports = {
  desc: 'Request to send password reset codes to an account\'s email address.',
  type: 'object',
  fields: {
    username: field('Username', {
      desc: 'Username of account to reset.',
    }),
  },
};
