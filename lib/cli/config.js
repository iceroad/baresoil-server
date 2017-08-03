function Config(base, args) {
  const config = base.getConfig(args);
  try {
    base.validateConfig();
  } catch (e) {
    console.error(`Cannot validate configuration: ${e.message}`);
    return process.exit(1);
  }

  config.provider = base.getProviderList().slice(1).join(',');
  const configStr = JSON.stringify(config, null, 2);
  console.log(configStr);
}

module.exports = Config;
