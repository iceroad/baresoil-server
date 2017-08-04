const runtype = require('runtype'),
  Types = require('../types')
;

function Run(base) {
  runtype.loadIntoLibrary(Types);
  base.init((err) => {
    if (err) {
      console.error(err);
      return process.exit(1);
    }
    base.getImpl().Server.listen((err) => {
      if (err) {
        console.error(err);
        return process.exit(1);
      }
    });
  });
}

module.exports = Run;
