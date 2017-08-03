/* eslint-disable global-require */
const enforce = require('runtype').enforce;

module.exports = {
  get: enforce(require('./get')),
  logout: enforce(require('./logout')),
};
