const def = require('runtype').schemaDef,
  path = require('path')
;


module.exports = {
  deps: ['Config', 'SerDe', 'BlobStore', 'MetaStore', 'MakeError'],
  config: {
    type: 'object',
    desc: 'Options for an in-memory AppManager implementation.',
    fields: {
      sysAppClientPath: {
        type: 'string',
        optional: true,
        desc: 'Path to custom system application client distribution.',
      },
      sysAppServerPath: {
        type: 'string',
        optional: true,
        desc: 'Path to custom system application server project.',
      },
    },
  },
  defaults: {},
  syslib: {
    create: {
      arguments: def.TypedArray([
        def.Type('AppCreateRequest'),
      ]),
    },
    delete: {
      arguments: def.TypedArray([
        def.Type('AppDeleteRequest'),
      ]),
    },
    get: {
      arguments: def.TypedArray([
        def.Type('AppGetRequest'),
      ]),
    },
    update: {
      arguments: def.TypedArray([
        def.Type('AppConfig'),
        def.Type('base64_buffer'),
      ]),
    },
  },
};
