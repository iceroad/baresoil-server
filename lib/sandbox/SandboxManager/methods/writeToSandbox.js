const stablejson = require('json-stable-stringify'),
  states = require('../states')
  ;

function writeToSandbox(clientId, outArray) {
  const sandbox = this.sandboxes_[clientId];
  if (!sandbox) {
    throw new Error(`Unknown client ${clientId}`);
  }
  const sbState = sandbox.state;
  switch (sbState) {
    case states.STARTING:
    case states.SETUP:
    case states.READY: {
      try {
        const outStr = `${stablejson(outArray)}\n`;
        sandbox.child.stdin.write(outStr);
        this.clientLog_(clientId, 'sandbox_write', outStr);
      } catch (e) {
        console.debug(e);
        throw new Error(`Cannot write to sandbox: ${e.message}`);
      }
      break;
    }

    default:
      // in a shutdown state, cannot write to sandbox anymore.
      throw new Error('Sandbox is shutting down.');
  }
}

module.exports = writeToSandbox;
