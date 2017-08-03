const def = require('runtype').schemaDef,
  field = require('../types/fields')
;

module.exports = {
  deps: ['Config', 'AppManager', 'UserManager'],
  config: {
    type: 'object',
    desc: 'Options for the syslib function dispatcher.',
    fields: {
    },
  },
  defaults: {
  },
  emit: {
    sb_syscall_response: [field('ClientId'), def.Type('SyscallResponse')],
  },
  accept: {
    sb_syscall_request: [def.Type('BaseConnection'), def.Type('SyscallRequest')],
  },
};
