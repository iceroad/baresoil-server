const field = require('../fields');

module.exports = {
  desc: 'User session token.',
  type: 'object',
  fields: {
    authToken: field('AuthToken'),
    expires: field('Expires'),
    userId: field('UserId'),
  },
};
