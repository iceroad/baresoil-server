const _ = require('lodash'),
  digest = require('./digest'),
  stablejson = require('json-stable-stringify')
  ;

module.exports = function version(obj) {
  const clone = _.cloneDeep(obj);
  delete clone.version;
  return digest(stablejson(clone), 'base64');
};
