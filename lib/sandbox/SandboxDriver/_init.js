// _init: sandbox bootloader.
//
// The purpose of this program is to extract a userspace tarball
// into a temporary directory, inspect its baresoil.json for a custom
// sandbox driver executable, or otherwise load the default (Javascript)
// sandbox driver.
//
const _ = require('lodash'),
  async = require('async'),
  fs = require('fs'),
  minimist = require('minimist'),
  path = require('path'),
  spawnSync = require('child_process').spawnSync,
  tar = require('tar'),
  temp = require('temp')
  ;


function main(args) {
  let pkgBuffer = Buffer.allocUnsafe(0);
  let pkgBufferSize;

  try {
    const appEnv = JSON.parse(process.env.APP_ENV);
    _.forEach(appEnv, (envItem) => {
      process.env[envItem.key] = envItem.value;
    });
  } catch (e) {
    console.error(`Cannot set application environment: ${e}`);
  }

  return async.auto({
    // Accept tarball as a binary message from the parent prefixed with a
    // 32-bit unsigned integer length (4 bytes).
    tarball: (cb) => {
      function processChunk(dataChunk) {
        pkgBuffer = Buffer.concat([pkgBuffer, dataChunk]);

        // Get package buffer length from first 4 bytes.
        if (pkgBuffer.length >= 4 && !pkgBufferSize) {
          pkgBufferSize = pkgBuffer.readUInt32LE();
        }

        // Wait for complete package to be read.
        if (pkgBuffer.length === pkgBufferSize + 4) { // 4 bytes for size prefix
          process.stdin.removeListener('data', processChunk);
          return cb(null, pkgBuffer.slice(4));
        }
      }
      return process.stdin.on('data', processChunk);
    },

    // Extract tarball into a temporary working directory.
    wd: ['tarball', (deps, cb) => {
      const cwd = temp.mkdirSync({ dir: process.cwd() });

      let nativeTarPath;
      try {
        nativeTarPath = JSON.parse(process.env.SERDE_CONFIG).nativeTarPath;
      } catch (e) {
        console.error('Using node-tar.');
      }
      if (nativeTarPath) {
        console.error(`Using native tar at ${nativeTarPath}`);
        const rv = spawnSync(nativeTarPath, ['-xz'], {
          cwd,
          shell: false,
          stdio: ['pipe', 'pipe', 'inherit'],
          input: deps.tarball,
        });
        if (rv.status !== 0) {
          return cb(new Error(`Cannot spawn native tar ${nativeTarPath}`));
        }
        return cb(null, cwd);
      }

      // node-tar
      const stream = tar.extract({ cwd });
      stream.once('close', () => cb(null, cwd));
      stream.end(deps.tarball);
    }],

    // Check baresoil.json for custom configuration.
    baresoilJson: ['wd', (deps, cb) => {
      // Get custom sandbox driver executable from baresoil.json if it exists.
      let baresoilJson;
      try {
        const baresoilJsonPath = path.join(deps.wd, 'baresoil.json');
        if (fs.existsSync(baresoilJsonPath)) {
          baresoilJson = require(baresoilJsonPath);
        }
      } catch (e) {
        return cb(e);
      }
      return cb(null, baresoilJson);
    }],

    // Start sandbox driver.
    sbDriver: ['baresoilJson', (deps, cb) => {
      const sbDriverCmd = _.get(deps.baresoilJson, 'server.driver');

      // If there is a custom sandbox driver command, spawnSync() the command
      // with a shell and exit on termination with the same code.
      if (sbDriverCmd) {
        const driverExit = spawnSync(sbDriverCmd, {
          cwd: deps.wd,
          shell: true,
          stdio: 'inherit',
        });
        return process.exit(driverExit.status || 0);
      }

      // Use the default sandbox driver within this process.
      process.chdir(deps.wd);
      return cb(null, require(path.join(__dirname, 'main.js'))(args));
    }],
  });
}

main(minimist(process.argv.slice(2)));
