const normalize = require('normalize-path'),
  path = require('path')
  ;


function normalizeRelativePath(inPath) {
  return path.normalize(normalize(inPath || ''))
    .replace(/^[./\\\s]+/, '')
    .replace(/[/\s]+$/, '');
}

module.exports = {
  normalizeRelativePath,
};

