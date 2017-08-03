/* eslint-disable global-require */
const enforce = require('runtype').enforce;

module.exports = {
  authorize: enforce(require('./authorize')),
  create: enforce(require('./create')),
  login: enforce(require('./login')),
  // requestPasswordReset: enforce(require('./requestPasswordReset')),
  // resetPassword: enforce(require('./resetPassword')),
};
