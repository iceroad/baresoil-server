const _ = require('lodash'),
  chalk = require('chalk'),
  dirutil = require('../util/dirutil'),
  temp = require('temp')
  ;


function SourcePackage(base, args) {
  const sourcePackages = base.getSourcePackages();

  // Generate sorted list of package roots with plugins before providers.
  const allPackages = _.uniq(_.concat(
    sourcePackages.plugins,
    sourcePackages.providers));

  // Create temporary directory to hold output tree.
  const treeRoot = args.output || temp.mkdirSync({ dir: process.cwd() });

  // Copy each package's source files to its output directory.
  _.forEach(allPackages, pkgSrcPath => dirutil.copyPackage(pkgSrcPath, treeRoot));
  console.log(`Wrote source tree to output directory "${chalk.green.bold(treeRoot)}".`);
}

module.exports = SourcePackage;
