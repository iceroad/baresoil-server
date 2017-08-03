/* eslint-disable global-require */
module.exports = {
  account: require('./account'),
  app: require('./app'),
  deploy: require('./deploy'),
  echo: (fnArg, cb) => cb(null, fnArg),
};
