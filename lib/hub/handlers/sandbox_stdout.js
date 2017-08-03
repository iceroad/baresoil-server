const _ = require('lodash');

module.exports = function onSandboxStdout(clientId, stdoutStr) {
  const lines = stdoutStr.split('\n');
  _.forEach(lines, line => console.debug(`sandbox:${clientId}:stdout> ${line}`));
};
