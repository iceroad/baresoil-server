const field = require('../fields');

module.exports = {
  desc: 'Request to get user information by user ID or username.',
  type: 'object',
  fields: {
    userId: field('UserId', { optional: true }),
    username: field('Username', { optional: true }),
  },
};
