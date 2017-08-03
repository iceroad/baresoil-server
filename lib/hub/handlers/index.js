/* eslint-disable global-require */
module.exports = {
  // From server
  http_request: require('./http_request'),
  ws_session_request: require('./ws_session_request'),
  ws_rpc_request: require('./ws_rpc_request'),
  ws_session_end: require('./ws_session_end'),
  socket_start: require('./socket_start'),
  socket_end: require('./socket_end'),

  // From sandbox
  sandbox_stdout: require('./sandbox_stdout'),
  sandbox_stderr: require('./sandbox_stderr'),
  sandbox_end: require('./sandbox_end'),
  http_response: require('./http_response'),
  ws_session_response: require('./ws_session_response'),
  ws_rpc_response:  require('./ws_rpc_response'),
  ws_user_event: require('./ws_user_event'),
  sb_syscall_request: require('./sb_syscall_request'),

  // From syslib
  sb_syscall_response: require('./sb_syscall_response'),
};
