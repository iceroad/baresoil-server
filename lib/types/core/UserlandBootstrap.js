const field = require('../fields');

module.exports = {
  name: 'UserlandBootstrap',
  desc: 'Information needed to bootstrap a userland environment.',
  type: 'object',
  fields: {
    package: {
      type: 'base64_buffer',
      desc: 'Userland archive.',
    },
    environment: field('SandboxEnvironmentVars'),
  },
};
