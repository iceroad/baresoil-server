const field = require('../fields');


module.exports = {
  name: 'SessionRequest',
  desc: 'Client request to set up a new WebSocket session.',
  type: 'object',
  fields: {
    userData: field('UserData'),
    headers: field('HttpHeaders', {
      optional: true,
      message: 'Request headers included with the initial HTTP upgrade request.',
    }),
  },
};
