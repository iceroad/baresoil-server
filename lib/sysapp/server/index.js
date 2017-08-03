/* eslint-disable global-require */
const _ = require('lodash'),
  runtype = require('runtype')
;

_.extend(runtype.library, require('./types'));

module.exports = _.extend(...[
  {},
  require('./api/unauthenticated'),
  require('./auth'),
]);
