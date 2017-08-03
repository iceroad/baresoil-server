const assert = require('chai').assert,
  async = require('async'),
  clog = require('../../lib/util/clog').testMode(),
  fakedata = require('../fakedata'),
  harness = require('./harness'),
  json = JSON.stringify
  ;

/* eslint-disable no-undef */
describe('Sysapp: user management', function test() {
  let bsServer, sbDriver;

  this.slow(3000);
  this.timeout(6000);

  beforeEach((cb) => {
    harness((err, server, bc, sbd) => {
      if (err) return cb(err);
      bsServer = server;
      sbDriver = sbd;
      return cb();
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });

  const username = fakedata.Email();
  let session;

  it('create, login, authorize, logout', (cb) => {
    async.series([
      // Create  new account
      cb => sbDriver.invoke_('account.create', {
        username,
        password: 'catscatscats!!!',
      }, cb),
      // Attempt to get user information, which should fail because we have
      // not logged in yet.
      cb => sbDriver.invoke_('account.get', {}, (err) => {
        assert.isOk(err);
        assert.match(err.message, /not found/);
        cb();
      }),
      // Log in to account, generating a session.
      cb => sbDriver.invoke_('account.login', {
        username,
        password: 'catscatscats!!!',
      }, (err, userSession) => {
        assert.isNotOk(err);
        session = userSession;
        return cb(err);
      }),
      // Attempt to get user information. This time, the call should succeed
      // because we are logged in.
      cb => sbDriver.invoke_('account.get', {}, (err, userInfo) => {
        assert.isNotOk(err);
        assert.isNotOk(userInfo.hashedPassword);
        return cb();
      }),
      // End this session using logout().
      cb => sbDriver.invoke_('account.logout', {}, cb),
      // Attempt to get user information, which should fail because we have
      // logged out.
      cb => sbDriver.invoke_('account.get', {}, (err) => {
        assert.isOk(err);
        assert.match(err.message, /not found/);
        cb();
      }),
      // Ensure that authorize() on the old session fails.
      cb => sbDriver.invoke_('account.authorize', session, (err) => {
        assert.isOk(err);
        assert.match(err.message, /no such session/i);
        return cb();
      }),
      // Log in to account, generating a new session.
      cb => sbDriver.invoke_('account.login', {
        username,
        password: 'catscatscats!!!',
      }, (err) => {
        assert.isNotOk(err);
        return cb(err);
      }),
    ], cb);
  });
});
