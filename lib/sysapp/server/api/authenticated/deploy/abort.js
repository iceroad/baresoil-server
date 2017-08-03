const assert = require('assert'),
  fse = require('fs-extra')
;

function abort(cb) {
  assert(this.$session);

  const stage = this.$stage;
  if (!stage) {
    return cb(new Error('No stage in progress.'));
  }
  delete this.$stage;

  try {
    fse.removeSync(stage.stageDir);
  } catch (e) {
    console.error(e);
  }

  return cb();
}


abort.$schema = {
  arguments: [],
  callbackResult: [],
};


module.exports = abort;
