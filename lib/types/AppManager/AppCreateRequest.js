const field = require('../fields');

const optional = true;

module.exports = {
  desc: 'Request to create a new application.',
  type: 'object',
  fields: {
    hostname: field('Hostname'),
    name: field('AppName', { optional }),
    userId: field('UserId', {
      optional,
      message: 'User ID of user making the request.',
    }),
  },
};
