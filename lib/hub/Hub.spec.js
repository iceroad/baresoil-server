const field = require('../types/fields'),
  def = require('runtype').schemaDef
;

module.exports = {
  deps: ['Config', 'AppManager', 'EventLog', 'Syslib', 'SandboxManager', 'Server'],
  config: {
    type: 'object',
    desc: 'Options for the central message routing hub.',
    fields: {
    },
  },
  defaults: {},
  accept: {
    // From Server
    http_request: [def.Type('BaseConnection'), def.Type('HttpRequest')],
    ws_session_request: [def.Type('BaseConnection'), def.Type('SessionRequest')],
    ws_session_end: [field('ClientId')],
    ws_rpc_request: [field('ClientId'), def.Type('RpcRequest')],
    socket_start: [field('ClientId'), def.Type('SocketInfo')],
    socket_end: [field('ClientId'), def.Type('SocketInfo')],

    // From SandboxManager
    sandbox_stdout: [field('ClientId'), def.Type('string')],
    sandbox_stderr: [field('ClientId'), def.Type('string')],
    sandbox_end: [field('ClientId'), def.Type('SandboxExitInfo')],
    http_response: [field('ClientId'), def.Type('HttpResponse')],
    ws_session_response: [field('ClientId'), def.Type('SessionResponse')],
    ws_rpc_response: [field('ClientId'), def.Type('RpcResponse')],
    ws_user_event: [field('ClientId'), def.Type('UserEvent')],
    sb_syscall_request: [def.Type('BaseConnection'), def.Type('SyscallRequest')],

    // From Syslib
    sb_syscall_response: [field('ClientId'), def.Type('SyscallResponse')],
  },
};
