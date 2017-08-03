const _ = require('lodash'),
  constants = require('../util/constants'),
  fs = require('fs'),
  jsonlint = require('jsonlint'),
  path = require('path')
  ;


function readConfigFromFile(configPath) {
  let rawConfig, config = {};
  try {
    rawConfig = fs.readFileSync(configPath, 'utf-8');
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error(e);
    }
    throw new Error(
      `Cannot read configuration from "${configPath}": ${e.message}`);
  }

  try {
    config = jsonlint.parse(rawConfig);
  } catch (e) {
    throw new Error(
      `Cannot parse JSON configuration in "${configPath}": ${e.message}`);
  }

  return config;
}


function getConfig(args) {
  let config = {}, configPath;

  // Command-line arguments for config file, if specified, must exist.
  const argConfigPath = args.config || args.c;
  if (argConfigPath) {
    console.debug(`Attempting to read configuration from "${argConfigPath}"...`);
    config = readConfigFromFile(argConfigPath); // throws on error
    configPath = argConfigPath;
    delete args.config;
    delete args.c;
  } else {
    // Look for default config file in working directory.
    // No error if it does not exist.
    try {
      const defaultConfigPath = path.join(process.cwd(), constants.DEFAULT_CONFIG_FILE);
      config = readConfigFromFile(defaultConfigPath);
      configPath = defaultConfigPath;
    } catch (e) {
      console.debug(
        'No configuration file specified and none found in working directory.');
    }
  }

  if (configPath) {
    console.debug(`Configuration read from ${configPath}.`);
  }

  if (_.isEmpty(config)) {
    console.debug('Using empty configuration.');
  }

  return { config, configPath };
}

module.exports = getConfig;
