/* eslint-disable global-require */
module.exports = {
  authorize: require('./authorize'),
  create: require('./create'),
  get: require('./get'),
  hashPassword: require('./hashPassword'),
  login: require('./login'),
  logout: require('./logout'),
  resetPassword: require('./resetPassword'),
  sendPasswordReset: require('./sendPasswordReset'),
  update: require('./update'),
  verifyHashedPassword: require('./verifyHashedPassword'),
};
