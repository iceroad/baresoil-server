const os = require('os');

module.exports = {
  deps: ['Config'],
  config: {
    type: 'object',
    desc: 'Options for the serialization module.',
    fields: {
      useNativeTar: {
        type: 'boolean',
        desc: 'If true, use native "tar" binary for archiving.',
      },
      nativeTarPath: {
        type: 'string',
        optional: true,
        desc: 'If useNativeTar is set, specifies the absolute path to the tar binary.',
      },
    },
  },
  defaults: {
    useNativeTar: os.type() === 'Windows_NT' ? false : true,
    nativeTarPath: '/bin/tar',
  },
};
