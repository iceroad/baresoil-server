const assert = require('assert'),
  fse = require('fs-extra'),
  path = require('path'),
  pathutil = require('../../../util/pathutil')
  ;


function remove(deleteArg, cb) {
  const stage = this.$stage;
  if (!stage) {
    return cb(new Error('No stage in progress.'));
  }

  const relPath = pathutil.normalizeRelativePath(deleteArg.path);

  //
  // For client-side files, remove the entry from the manifest.
  //
  if (deleteArg.component === 'client') {
    delete stage.clientManifestIdx[relPath];
  }

  //
  // For server-side files, attempt to delete from staging directory.
  //
  if (deleteArg.component === 'server') {
    try {
      fse.removeSync(path.join(stage.stageDir, relPath));
      delete stage.serverManifestIdx[relPath];
    } catch (e) { console.error(e); }
  }

  return cb();
}


remove.$schema = {
  arguments: [
    {
      type: 'object',
      fields: {
        component: { type: 'factor', factors: ['server', 'client'] },
        path: { type: 'string', minLength: 1, maxLength: 256 },
      },
    },
  ],
  callbackResult: [],
};


module.exports = remove;
