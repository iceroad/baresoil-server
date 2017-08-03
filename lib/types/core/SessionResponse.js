const field = require('../fields');

module.exports = {
  name: 'SessionResponse',
  desc: 'Response to client WebSocket session setup request.',
  type: 'object',
  fields: {
    auth: {
      type: 'boolean',
      desc: 'True if client is authorized; false to terminate client.',
    },
    error: {
      type: 'PublicError',
      optional: true,
      desc: 'Error details, if "auth" is false.',
    },
    userData: field('UserData'),
  },
};
