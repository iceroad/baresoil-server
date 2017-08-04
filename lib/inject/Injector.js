/* eslint-disable import/no-dynamic-require */
const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  col = require('../util/colutil'),
  construct = require('runtype').construct,
  getConfig = require('./getConfig'),
  getProviders = require('./getProviders'),
  minimist = require('minimist'),
  json = JSON.stringify,
  path = require('path'),
  ReplaceArrays = require('../util/replaceArrays')
  ;


class Injector {
  constructor(configOverrides, extraProviders, cmdlineArgs) {
    // Read baresoil-server.conf.json.
    const args = this.args_ = cmdlineArgs || minimist(process.argv.slice(2));
    this.diskConfig_ = getConfig(args);
    const bsConf = this.diskConfig_.config;

    // If configOverrides is specified, merge it into 'server' section of bsConf.
    if (configOverrides) {
      assert(_.isObject(configOverrides), 'configOverrides must be an object');
      bsConf.server = bsConf.server || {};
      _.merge(bsConf.server, configOverrides);
    }

    // Get absolute paths to provider packages.
    const providers = this.providers_ = getProviders(args, bsConf, extraProviders);
    console.debug(`Provider configuration: ${json(providers, null, 2)}`);

    // Load and merge all providers and plugins into a composite prototype class.
    const ClassSet = this.classSet_ = {};
    _.forEach(providers, (provider) => {
      // Providers can update the core class set.
      const providerRef = `"${col.thead(provider.name)}"`;
      if (provider.paths.server) {
        const libModulePath = path.join(provider.paths.root, provider.paths.server);
        const libModule = require(libModulePath);
        this.mergeClassSet_(ClassSet, libModule, provider, providerRef);
      }

      // Plugins too.
      _.forEach(provider.plugins, (plugin) => {
        const pluginRef = `"${col.thead(provider.name)}:${col.thead(plugin.name)}"`;
        if (plugin.paths.server) {
          const libModulePath = path.join(plugin.paths.root, plugin.paths.server);
          const libModule = require(libModulePath);
          this.mergeClassSet_(ClassSet, libModule, provider, pluginRef);
        }
      });
    });

    // Instantiate the final set of class instances.
    const Impl = this.impl_ = _.mapValues(
      ClassSet, ClassConstructor => new ClassConstructor());

    // Generate composite configuration schema and config defaults.
    const defaults = _.mapValues(Impl, impl => impl.$spec.defaults || {});
    this.config_ = _.mergeWith({}, defaults, bsConf.server, ReplaceArrays);
    this.configSchema_ = {
      type: 'object',
      fields: _.mapValues(Impl, impl => impl.$spec.config || { type: 'any' }),
    };

    // Load all CLI command specifications.
    this.loadCli();
  }

  loadCli() {
    // Iterate over all providers, collecting CLI commands and implementation sets.
    const cliCommands = this.cli_ = {};
    _.forEach(this.providers_, (provider) => {
      // Extract provider-global CLI commands.
      if (provider.paths.cli) {
        this.loadCliCommands_(
          cliCommands,
          path.join(provider.paths.root, provider.paths.cli),
          provider);
      }

      // Extract plugin CLI commands.
      _.forEach(provider.plugins, (plugin) => {
        if (plugin.paths.cli) {
          this.loadCliCommands_(
            cliCommands,
            path.join(plugin.paths.root, plugin.paths.cli),
            provider,
            plugin);
        }
      });
    });
  }

  getCliCommand(cmdName) {
    const cmd = this.cli_[cmdName];
    if (!cmd) {
      throw new Error(`Unknown command "${cmdName}".`);
    }
    if (!cmd.impl) {
      const modPath = path.join(cmd.root, cmd.name);
      console.debug(`injector: loading CLI command "${col.thead(cmdName)}" from ` +
        `"${col.bold(modPath)}"`);
      cmd.impl = require(modPath);
    }
    return cmd;
  }

  loadCliCommands_(composite, pathSpec, provider, plugin) {
    const commands = require(pathSpec);
    const entityName = _.filter([
      provider ? col.thead(provider.name) : null,
      plugin ? col.thead(plugin.name) : null,
    ]).join(':');
    _.forEach(commands, (cmdDef, cmdName) => {
      if (cmdName in composite) {
        console.debug(col.mildDanger(
          `injector: Module "${entityName}" replaced CLI command "${cmdName}".`));
      }
      cmdDef.root = pathSpec;
      composite[cmdName] = cmdDef;
      if (provider.name !== 'default') {
        console.debug(
          `injector: CLI command "${col.thead(cmdName)}" provided by ${col.bold(entityName)}`);
      }
    });
  }

  mergeClassSet_(composite, pluginImpl, provider, pluginRef) {
    // Iterate over all override classes in this plugin.
    _.forEach(pluginImpl, (classConstructor, className) => {
      // Merge all non-constructor methods and properties of classConstructor into
      // the composite class set.
      const propNames = Object.getOwnPropertyNames(classConstructor.prototype);
      _.forEach(propNames, (propName) => {
        // Do not copy constructors from plugins.
        if (propName === 'constructor') return;

        // First time seeing this class?
        if (!composite[className]) {
          composite[className] = classConstructor;
          if (provider.name !== 'default') {
            console.debug(
              `injector: initializing class "${col.thead(className)}" ` +
                `from plugin ${pluginRef}`);
          }
          return;
        }

        const propVal = classConstructor.prototype[propName];
        if (_.isFunction(propVal)) {
          if (provider.name !== 'default') {
            console.debug(
              `injector: setting method "${col.thead(className)}.${col.command(propName)}" ` +
                `from plugin ${pluginRef}`);
          }
          composite[className].prototype[propName] = propVal;
        } else {
          if (_.isObject(propVal)) {
            if (provider.name !== 'default') {
              console.debug(
                `injector: merging object "${col.thead(className)}.${col.command(propName)}" ` +
                  `from plugin ${pluginRef}`);
            }
            _.mergeWith(composite[className].prototype[propName], propVal, ReplaceArrays);
          } else {
            console.debug(
              `injector: setting value "${col.thead(className)}.${col.command(propName)}" ` +
                `from plugin ${pluginRef}`);
            composite[className].prototype[propName] = propVal;
          }
        }
      });
    });
  }

  init(cb) {
    // Validate configuration against its schema.
    try {
      construct(this.configSchema_, this.config_);
    } catch (e) {
      console.debug(e);
      throw new Error(`Invalid configuration: ${e.message}`);
    }

    const initDepGraph = _.mapValues(this.impl_, (inst) => {
      const deps = _.clone(inst.$spec.deps) || [];
      deps.splice(0, 0, '$config');

      const initFn = inst.init || (cb => cb());
      deps.push((deps, cb) => initFn.call(
          inst, deps, (err, result) => cb(err, result || inst)));

      return deps;
    });

    initDepGraph.$config = cb => cb(null, this.config_);

    const destroyDepGraph = _.mapValues(this.impl_, (inst) => {
      const deps = _.clone(inst.$spec.deps) || [];
      deps.splice(0, 0, '$config');

      const destroyFn = inst.destroy || (cb => cb());
      deps.push((deps, cb) => destroyFn.call(
        inst, deps, (err, result) => cb(err, result || inst)));

      return deps;
    });

    destroyDepGraph.$config = cb => cb(null, this.config_);

    // Bind termination events and initialize server.
    this.cleanup_ = _.once((cb) => {
      console.debug('injector: executing destroy() graph.');
      async.auto(destroyDepGraph, (err) => {
        console.debug('injector: cleanup completed.');
        cb && cb();
      });
    });
    process.once('exit', this.cleanup_);
    process.once('SIGINT', this.cleanup_);

    // Start initialization.
    console.debug('injector: executing init() graph.');
    return async.auto(initDepGraph, cb);
  }

  destroy(cb) {
    process.removeListener('exit', this.cleanup_);
    process.removeListener('SIGINT', this.cleanup_);
    return this.cleanup_(cb);
  }

  getAllCliCommands() {
    return this.cli_;
  }

  getProviderList() {
    return _.map(this.providers_, 'name');
  }

  getDiskConfig() {
    return getConfig(this.args_);
  }

  getConfig() {
    return this.config_;
  }

  getConfigSchema() {
    return this.configSchema_;
  }

  getImpl() {
    return this.impl_;
  }

  getSourcePackages() {
    const plugins = {}, providers = {};
    _.forEach(this.providers_, (provider) => {
      providers[provider.paths.root] = 1;
      _.forEach(provider.plugins, (plugin) => {
        plugins[plugin.paths.root] = 1;
      });
    });
    return {
      plugins: _.keys(plugins),
      providers: _.keys(providers),
    };
  }

  getArgs() {
    return this.args_;
  }

  validateConfig() {
    return construct(this.configSchema_, this.config_);
  }
}

module.exports = Injector;
