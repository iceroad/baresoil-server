module.exports = [
  {
    flags: ['config', 'c'],
    desc: 'Path to JSON configuration file.',
  },
  {
    flags: ['provider', 'p'],
    desc: 'Comma-separated list of custom provider plugins to load.',
  },
  {
    flags: ['log'],
    desc: 'Set logging level (or via process.env.LOG).',
    defVal: 'info',
    values: ['debug', 'info', 'warning', 'error', 'quiet'],
  },
];
