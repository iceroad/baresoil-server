module.exports = function onSbSyscallRequest(baseConnection, syscallRequest) {
  this.clientLog_(baseConnection.clientId, 'syscall_request', JSON.stringify(syscallRequest));
  this.deps.Syslib.accept('sb_syscall_request', baseConnection, syscallRequest);
};
