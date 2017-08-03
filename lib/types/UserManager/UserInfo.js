const field = require('../fields');

const optional = true;

module.exports = {
  desc: 'Information about a system user.',
  type: 'object',
  fields: {
    apps: field('UserAppList', { optional }),
    hashedPassword: field('HashedPassword', { optional }),
    name: {
      type: 'string',
      desc: 'Friendly name for this user account.',
      optional: true,
      maxLength: 128,
    },
    securityEvents: {
      type: 'array',
      elementType: 'AccountSecurityEvent',
      desc: 'Most recent security-related events for account.',
    },
    sessions: {
      type: 'array',
      elementType: 'UserSessionHashed',
      desc: 'Active sessions for user.',
    },
    status: field('EntityStatus'),
    userId: field('UserId', { optional }),
    username: field('Username', { optional }),
    verified: {
      type: 'boolean',
      desc: 'True if account has been verified.',
    },
  },
};
