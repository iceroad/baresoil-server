const field = require('../fields');

module.exports = {
  desc: 'Deployment stage status.',
  type: 'object',
  fields: {
    clientManifest: field('FileManifest', {
      desc: 'Set of files in the application\'s client web distribution.',
    }),
    serverManifest:  field('FileManifest', {
      desc: 'Set of files in the application\'s server package.',
    }),
  },
};
