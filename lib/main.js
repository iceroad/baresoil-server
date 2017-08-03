#!/usr/bin/env node
const clog = require('./util/clog').enable(),
  minimist = require('minimist'),
  runtype = require('runtype'),
  packageJson = require('../package.json'),
  setupCLI = require('./util/setupCLI'),
  Injector = require('./inject/Injector'),
  TypeLibrary = require('./types')
  ;


function main(args) {
  runtype.loadIntoLibrary(TypeLibrary);

  // Create default injector.
  let base;
  try {
    base = new Injector();
  } catch (e) {
    console.error(e);
    console.error(`Cannot initialize providers: ${e.message}`);
    return process.exit(1);
  }

  // Get CLI command list from injector.
  const commands = base.getAllCliCommands();
  try {
    clog.restore();
    setupCLI('baresoil-server', packageJson, commands, base.getArgs());
    clog.enable();
  } catch (e) {
    console.error(e.message);
    return process.exit(1);
  }

  // Get subcommand from injector, or show usage.
  const reqCmd = (args._[0] || '').toLowerCase().trim();
  const cmd = base.getCliCommand(reqCmd);
  return cmd.impl(base, args);
}


if (require.main !== module) {
  module.exports = main;
} else {
  Error.stackTraceLimit = 100;
  main(minimist(process.argv.slice(2)));
}
