const _ = require('lodash'),
  chalk = require('chalk'),
  fs = require('fs'),
  fse = require('fs-extra'),
  path = require('path')
  ;

function exportLocalFiles(dirPath) {
  const allFiles = fs.readdirSync(dirPath);
  const jsFiles = _.filter(allFiles, filename => filename.match(/\.js$/i));
  const exportObj = {};
  _.forEach(jsFiles, (filename) => {
    if (filename === 'index.js') return;
    const basename = path.basename(filename, '.js');
    exportObj[basename] = require(path.join(dirPath, filename));
  });
  return exportObj;
}


function copyPackage(srcPath, outRoot) {
  const pkgJson = require(path.join(srcPath, 'package.json'));
  console.debug(`Package "${chalk.cyan(pkgJson.name)}" found in "${srcPath}"`);

  const defaultFilesToCopy = [
    'lib', 'cli', 'index.js', 'package.json', 'package-lock.json', 'provider.js'];
  const filesToCopy = pkgJson.sourcePaths || _.intersection(
    defaultFilesToCopy, fse.readdirSync(srcPath));
  const pkgOutRoot = path.join(outRoot, pkgJson.name);
  _.forEach(filesToCopy, (relPath) => {
    const srcPathAbs = path.join(srcPath, relPath);
    const outPathAbs = path.join(pkgOutRoot, relPath);
    console.debug(`Copy "${srcPathAbs}" -> "${outPathAbs}"`);
    fse.copySync(srcPathAbs, outPathAbs, {
      dereference: true, // dereference symlinks
      filter: src => !src.match(/node_modules/),
    });
  });

  return pkgJson.name;
}


module.exports = {
  copyPackage,
  exportLocalFiles,
};
