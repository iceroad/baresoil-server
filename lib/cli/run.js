const runtype = require('runtype'),
  Types = require('../types')
;

function Run(base) {
  runtype.loadIntoLibrary(Types);
  base.init();
}

module.exports = Run;
