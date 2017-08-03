const field = require('../fields');

module.exports = {
  desc: 'User session with a hashed token, suitable for storage.',
  type: 'object',
  fields: {
    hashedToken: field('AuthToken'),
    expires: field('Expires'),
    remoteAddress: field('RemoteAddress'),
    userId: field('UserId'),
  },
};
