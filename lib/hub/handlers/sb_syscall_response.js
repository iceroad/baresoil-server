module.exports = function onSbSyscallResponse(clientId, syscallResponse) {
  const sandbox = this.deps.SandboxManager.getSandboxForClient(clientId);
  if (!sandbox) {
    console.debug(
      'Hub: received "syscall_response" for invalid client, ignoring.');
    return;
  }
  this.clientLog_(clientId, 'syscall_response', JSON.stringify(syscallResponse));
  this.deps.SandboxManager.accept('sb_syscall_response', clientId, syscallResponse);
};
