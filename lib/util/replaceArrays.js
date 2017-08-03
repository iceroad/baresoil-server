// Lodash _.mergeWith() customizer that replaces rather than concatenates arrays
// during a deep merge.
const _ = require('lodash');

function ReplaceArrays(objValue, srcValue) {
  if (_.isArray(srcValue)) {
    return srcValue;
  }
}

module.exports = ReplaceArrays;
