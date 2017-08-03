/* eslint-disable global-require */
const enforce = require('runtype').enforce;

module.exports = {
  create: enforce(require('./create')),
  delete: enforce(require('./delete')),
  get: enforce(require('./get')),
};
