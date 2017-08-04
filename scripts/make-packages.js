#!/usr/bin/env node
// Workaround for npm 5 excluding all "node_modules" paths, no matter how deep
// they are in the directory tree hierarchy. This prevents SandboxDriver and
// sysapp from having a node_modules in their directory subtree.
//
// This is a workaround for subdirectories containing node_modules that are
// pure JS (i.e., no binary module compilation).
const _ = require('lodash'),
  async = require('async'),
  fs = require('fs'),
  path = require('path'),
  BaresoilServer = require('../lib/BaresoilServer')
  ;

const LIBROOT = path.resolve(__dirname, '../lib');
const PKGROOT = path.resolve(__dirname, '../lib/packaged');

function makePackages() {
  const bsServer = new BaresoilServer();
  async.series([

    // Initialize BaresoilServer.
    cb => bsServer.initWithoutListen(cb),

    // Package sandbox/SandboxDriver
    cb => {
      const inPath = path.join(LIBROOT, 'sandbox/SandboxDriver');
      const outPath = path.join(PKGROOT, 'SandboxDriver.pkg');
      bsServer.SerDe.createArchive(inPath, (err, arBuffer) => {
        if (err) return cb(err);
        fs.writeFileSync(outPath, arBuffer);
        const outSizeKb = Math.floor(arBuffer.length / 1024);
        console.log(`Packaged ${inPath} --> ${outPath} (${outSizeKb} kb)`);
        return cb();
      });
    },

    // Package sysapp/server
    cb => {
      const inPath = path.join(LIBROOT, 'sysapp/server');
      const outPath = path.join(PKGROOT, 'SysappServer.pkg');
      bsServer.SerDe.createArchive(inPath, (err, arBuffer) => {
        if (err) return cb(err);
        fs.writeFileSync(outPath, arBuffer);
        const outSizeKb = Math.floor(arBuffer.length / 1024);
        console.log(`Packaged ${inPath} --> ${outPath} (${outSizeKb} kb)`);
        return cb();
      });
    },

  ], (err) => {
    if (err) {
      console.error(err);
      return process.exit(1);
    }
    return process.exit(0);
  });
}

makePackages();
