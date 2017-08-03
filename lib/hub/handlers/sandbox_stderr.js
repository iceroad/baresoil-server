const _ = require('lodash');

module.exports = function onSandboxStderr(clientId, stdoutStr) {
  const lines = stdoutStr.split('\n');
  _.forEach(lines, line => console.debug(`sandbox:${clientId}:stderr> ${line}`));
};
