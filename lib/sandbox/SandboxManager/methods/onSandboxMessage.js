const json = JSON.stringify,
  states = require('../states')
;

module.exports = function onSandboxMessage(clientId, inArray) {
  const sandbox = this.sandboxes_[clientId];
  if (!sandbox) return;

  const cmd = inArray[0];

  this.clientLog_(clientId, 'sandbox_read', json(inArray).substr(0, 200));

  try {

    if (cmd === 'ready') {
      this.clientLog_(clientId, 'sandbox_ready');
      sandbox.state = states.READY;
      if (sandbox.readyCallback) {
        const cb = sandbox.readyCallback;
        delete sandbox.readyCallback;
        return cb();
      }
      return;
    }

    if (cmd === 'rpc_response') {
      return this.emit('ws_rpc_response', clientId, inArray[1]);
    }

    if (cmd === 'user_event') {
      return this.emit('ws_user_event', clientId, inArray[1]);
    }

    if (cmd === 'http_response') {
      return this.emit('http_response', clientId, inArray[1]);
    }

    if (cmd === 'session_response') {
      const sessionResponse = inArray[1] || {};
      if (sessionResponse.auth === true) {
        this.clientLog_(clientId, 'sandbox_authorized');
      }
      if (!sessionResponse.error) {
        delete sessionResponse.error;
      }
      return this.emit('ws_session_response', clientId, sessionResponse);
    }

    if (cmd === 'syscall_request') {
      return this.emit('sb_syscall_request', sandbox.baseConnection, inArray[1]);
    }

    console.error(`Unrecognized sandbox message: ${cmd}`);

  } catch (e) {
    console.error(`Invalid message from sandbox: ${e}`);
  }
};
