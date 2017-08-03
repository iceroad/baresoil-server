class Config {
  init(deps, cb) {
    return cb(null, deps.$config);
  }

  destroy(deps, cb) {
    return cb();
  }
}

Config.prototype.$spec = {
  deps: [],
  config: {
    type: 'object',
    desc: 'Options for a Config implementation that reads configuration from disk.',
    fields: { },
  },
  defaults: { },
};


module.exports = Config;
