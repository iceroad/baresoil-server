const field = require('../fields');

module.exports = {
  desc: 'New system user creation request.',
  type: 'object',
  fields: {
    username: field('Username'),
    password: field('ClearPassword', { optional: true }),
    name: {
      type: 'string',
      desc: 'Friendly name for account.',
      optional: true,
    },
  },
};
