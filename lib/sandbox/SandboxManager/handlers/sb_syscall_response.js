module.exports = function onSyscallResponse(clientId, syscallResponse) {
  try {
    this.writeToSandbox(clientId, ['syscall_response', syscallResponse]);
  } catch (e) { }
};
