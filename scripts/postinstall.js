#!/usr/bin/env node
const path = require('path'),
  spawnSync = require('child_process').spawnSync
;

const SUBPACKAGES = [
  path.resolve(__dirname, '../lib/sandbox/SandboxDriver'),
  path.resolve(__dirname, '../lib/sysapp/server'),
];


SUBPACKAGES.forEach(pkgPath => spawnSync('npm install', {
  cwd: pkgPath,
  shell: true,
  stdio: 'inherit',
}));
