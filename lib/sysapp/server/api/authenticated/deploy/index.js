/* eslint-disable global-require */
const enforce = require('runtype').enforce;

module.exports = {
  abort: enforce(require('./abort')),
  commit: enforce(require('./commit')),
  getStatus: enforce(require('./getStatus')),
  stage: enforce(require('./stage')),
  remove: enforce(require('./remove')),
  upload: enforce(require('./upload')),
};
