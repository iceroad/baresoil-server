const field = require('../fields');

module.exports = {
  desc: 'Request to delete an application.',
  type: 'object',
  fields: {
    appId: field('AppId'),
  },
};
