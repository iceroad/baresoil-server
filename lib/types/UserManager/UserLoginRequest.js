const field = require('../fields');

module.exports = {
  desc: 'Request to log into a user account.',
  type: 'object',
  fields: {
    username: field('Username'),
    password: field('ClearPassword'),
  },
};
