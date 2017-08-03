const assert = require('assert'),
  tar = require('tar'),
  spawn = require('child_process').spawn
  ;


module.exports = function createArchive(dirPath, cb) {
  assert(this.isSerDe());
  const config = this.config_;
  const chunks = [];

  if (config.useNativeTar) {
    const child = spawn(config.nativeTarPath, ['--force-local', '-czh', '.'], {
      shell: false,
      cwd: dirPath,
      stdio: ['pipe', 'pipe', 'inherit'],
    });
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.on('error', (err) => {
      return cb(new Error(
        `Cannot start tar at path "${config.nativeTarPath}": ${err.message}`));
    });
    child.once('exit', (code, signal) => {
      if (code || signal) {
        return cb(new Error(
          `Could not create archive: tar exited with code ${code}, signal ${signal}`));
      }
      return cb(null, Buffer.concat(chunks));
    });
  } else {
    const tarOpt = {
      gzip: true,
      cwd: dirPath,
      portable: true,
      follow: true,
    };
    const tarStream = tar.create(tarOpt, ['.']);
    tarStream.on('data', chunk => chunks.push(chunk));
    tarStream.on('end', () => cb(null, Buffer.concat(chunks)));
  }
};
