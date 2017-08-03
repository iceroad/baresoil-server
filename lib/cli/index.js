const col = require('../util/colutil');

module.exports = {
  config: {
    name: 'config',
    desc: 'Print full configuration to console in JSON format and exit.',
    helpPriority: 1099,
    helpGroup: 'Advanced',
  },

  run: {
    name: 'run',
    desc: 'Start the server.',
    helpPriority: 500,
    helpGroup: 'Run',
  },

  'source-package': {
    name: 'source-package',
    desc: 'Creates a clean server package tree with all installed providers.',
    helpPriority: 1010,
    helpGroup: 'Advanced',
  },
};
