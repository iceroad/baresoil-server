const _ = require('lodash'),
  states = require('../states')
;

module.exports = function destroySandbox(clientId) {
  const sandbox = this.sandboxes_[clientId];
  if (sandbox) {
    switch (sandbox.state) {
      case states.STARTING:
      case states.SETUP: {
        // Kill without notice.
        try {
          sandbox.child.kill();
        } catch (e) {
          console.debug(`Cannot kill child ${clientId}: ${e.message}`);
        }
        break;
      }

      case states.READY: {
        // Kill with notice.
        try {
          this.writeToSandbox(clientId, ['shutdown']);
          sandbox.state = states.SHUTDOWN;
        } catch (e) {
          console.debug(e);
        }
        _.delay(() => {
          try {
            sandbox.child.kill();
          } catch (e) {
            console.debug(`Cannot kill child ${clientId}: ${e.message}`);
          }
        }, 500);
        break;
      }

      default: {
        // Dead states, do nothing.
        break;
      }
    }
  }
};
