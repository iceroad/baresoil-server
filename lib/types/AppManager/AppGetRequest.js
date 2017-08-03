const field = require('../fields');

module.exports = {
  desc: 'Request to get an application configuration by either appId or hostname.',
  type: 'object',
  fields: {
    appId: field('AppId', { optional: true }),
    hostname: field('Hostname', { optional: true }),
  },
};
