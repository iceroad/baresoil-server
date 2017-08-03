const field = require('../fields');

module.exports = {
  desc: 'Request to stage an application for modification and deployment.',
  type: 'object',
  fields: {
    appId: field('AppId'),
  },
};
