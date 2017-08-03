const _ = require('lodash'),
  path = require('path')
;


function resolveProvider(spec) {
  try {
    return require.resolve(`baresoil-provider-${spec}`);
  } catch (e) {
    // Not an installed package. directory.
    console.debug(
      `Provider "${spec}" is not an installed baresoil-provider-* ` +
        `package: ${e.message}`);

    const asPath = path.resolve(spec);
    try {
      require(spec);
      return asPath;
    } catch (e) {
      // Not a directory.
      console.debug(`Provider "${spec}" is not a directory: ${e.message}`);
    }
  }
  throw new Error(`Cannot resolve provider from "${spec}"`);
}

function getProviders(args, config, extraProviders) {
  // Start with the base provider.
  const providerList = [
    path.resolve(__dirname, '../../provider'),
  ];

  // Add any providers specified in "config.provider"
  if (_.get(config, 'provider')) {
    const providerPaths = _.uniq(_.map(
      _.filter(config.provider.split(',')), resolveProvider));
    providerList.push(...providerPaths);
  }

  // Add any providers specified in command-line arguments.
  const cmdLineProvider = args.p || args.provider;
  if (cmdLineProvider) {
    const providerPaths = _.uniq(_.map(
      _.filter(cmdLineProvider.split(',')), resolveProvider));
    providerList.push(...providerPaths);
    delete args.p;
    delete args.provider;
  }

  providerList.push(...(extraProviders || []));

  return _.map(providerList, require);
}

module.exports = getProviders;
