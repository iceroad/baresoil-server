const _ = require('lodash'),
  assert = require('assert'),
  tar = require('tar'),
  spawn = require('child_process').spawn
  ;


module.exports = function extractArchive(tarball, dirPath, cb) {
  assert(this.isSerDe());
  const config = this.config_;

  if (config.useNativeTar) {
    const child = spawn(config.nativeTarPath, ['-zx'], {
      shell: false,
      cwd: dirPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.write(tarball, null, () => {
      child.stdin.end();
    });
    child.on('error', (err) => {
      return cb(new Error(
        `Cannot start tar at path "${config.nativeTarPath}": ${err.message}`));
    });
    child.once('exit', (code, signal) => {
      if (code || signal) {
        return cb(new Error(
          `Could not extract archive: tar exited with code ${code}, signal ${signal}`));
      }
      return cb();
    });
  } else {
    const tarOpt = {
      gzip: false,
      cwd: dirPath,
      strict: true,
    };
    const cbOnce = _.once(cb);
    const tarStream = tar.extract(tarOpt);
    tarStream.on('close', () => cbOnce());
    tarStream.on('error', err => cbOnce(new Error(
      `Could not extract archive: ${err.message}`)));
    tarStream.end(tarball);
  }
};
