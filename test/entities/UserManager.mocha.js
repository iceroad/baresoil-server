const _ = require('lodash'),
  assert = require('chai').assert,
  async = require('async'),
  clog = require('../../lib/util/clog').testMode(),
  crypto = require('crypto'),
  fakedata = require('../fakedata'),
  json = JSON.stringify,
  sinon = require('sinon'),
  BaresoilServer = require('../../lib/BaresoilServer'),
  TestConfig = require('../config.json')
  ;

/* eslint-disable no-undef */
describe('UserManager: system-level user management', function test() {
  let bsServer, userManager, baseConnection, config;

  this.slow(3000);
  this.timeout(6000);

  beforeEach((cb) => {
    baseConnection = fakedata.BaseConnection(1);
    bsServer = new BaresoilServer(_.cloneDeep(TestConfig));
    sinon.stub(bsServer.Hub, 'init').yields();
    sinon.stub(bsServer.SandboxManager, 'init').yields();
    sinon.stub(bsServer.AppManager, 'init').yields();
    sinon.stub(bsServer.Server, 'init').yields();
    sinon.stub(bsServer.Server, 'listen').yields();
    userManager = bsServer.UserManager;
    bsServer.init((err, results) => {
      if (err) return cb(err);
      config = results.Config.UserManager;
      config.passwordHash.iterations = 100;
      return cb();
    });
  });

  afterEach((cb) => {
    bsServer.destroy(cb);
  });


  describe('User management: create, reset password, get, update', () => {
    it('should create a new account', (cb) => {
      sinon.spy(userManager, 'sendPasswordReset');
      userManager.create(baseConnection, {
        username: fakedata.Email(),
      }, (err, userInfo) => {
        assert.isNotOk(err);
        assert.isOk(userInfo);
        return cb();
      });
    });

    it('should not allow duplicate accounts with the same username', (cb) => {
      const username = fakedata.Email();
      async.series([
        cb => userManager.create(baseConnection, { username }, cb),
        cb => userManager.create(baseConnection, { username }, (err, userInfo) => {
          assert.isOk(err);
          assert.isNotOk(userInfo);
          assert.match(err.message, /already registered/i);
          return cb();
        }),
      ], cb);
    });

    it('should be able to retrieve users after creation', (cb) => {
      const username = fakedata.Email();
      async.series([
        cb => userManager.create(baseConnection, { username }, cb),
        cb => userManager.get(baseConnection, { username }, (err, userInfo) => {
          assert.isNotOk(err);
          assert.isOk(userInfo);
          assert.isAbove(userInfo.userId, 0);
          assert.strictEqual(userInfo.username, username);
          return cb();
        }),
      ], cb);
    });

    it('should be able to set password using reset codes', (cb) => {
      const username = fakedata.Email();
      let resetCode;
      async.series([
        cb => userManager.create(baseConnection, { username }, cb),
        cb => userManager.sendPasswordReset(baseConnection, { username }, cb),
        cb => userManager.get(baseConnection, { username }, (err, userInfo) => {
          assert.isNotOk(err);
          assert.isOk(userInfo);
          const resetReqEvents = _.filter(
            userInfo.securityEvents,
            secEvt => secEvt.eventType === 'password_reset_requested');
          assert.strictEqual(resetReqEvents.length, 1);
          resetCode = resetReqEvents[0].data.resetCode;
          return cb();
        }),
        cb => userManager.resetPassword(baseConnection, {
          username,
          resetCode: resetCode + 1,
          newPassword: 'ignored password',
        }, (err) => {
          assert.isOk(err);
          assert.match(err.message, /invalid reset/i);
          return cb();
        }),
        cb => userManager.resetPassword(baseConnection, {
          username,
          resetCode,
          newPassword: 'catscatscats!!!',
        }, cb),
        cb => userManager.get(baseConnection, { username }, (err, userInfo) => {
          assert.isNotOk(err);
          assert.isOk(userInfo);

          // Check post password-reset conditions.
          assert.isTrue(userInfo.verified);
          assert.isAbove(userInfo.hashedPassword.hash.length, 10);
          assert.deepEqual(_.map(userInfo.securityEvents, 'eventType'), [
            'password_reset_requested',
            'password_reset_failed',
            'password_reset_success',
          ]);
          assert.strictEqual(userInfo.sessions.length, 0);
          return cb();
        }),
      ], cb);
    });

    it('should temporarily lock the account after too many password resets', (cb) => {
      config.passwordResetLimitCount = 1;
      config.passwordResetLimitTimeMs = 100;
      const username = fakedata.Email();
      async.series([
        cb => userManager.create(baseConnection, { username }, cb),
        cb => userManager.sendPasswordReset(baseConnection, { username }, cb),
        cb => userManager.sendPasswordReset(baseConnection, { username }, (err) => {
          assert.isOk(err);
          assert.match(err.message, /temporarily locked/i);
          _.delay(cb, config.passwordResetLimitTimeMs * 2);
        }),
        cb => userManager.sendPasswordReset(baseConnection, { username }, cb),
      ], cb);
    });

    it('should invalidate reset codes after a time limit', (cb) => {
      config.passwordResetTimeoutMs = 100;
      const username = fakedata.Email();
      let resetCode;
      async.series([
        cb => userManager.create(baseConnection, { username }, cb),
        cb => userManager.sendPasswordReset(baseConnection, { username }, cb),
        cb => userManager.get(baseConnection, { username }, (err, userInfo) => {
          assert.isNotOk(err);
          assert.isOk(userInfo);
          const resetReqEvents = _.filter(
            userInfo.securityEvents,
            secEvt => secEvt.eventType === 'password_reset_requested');
          assert(resetReqEvents.length, 1);
          resetCode = resetReqEvents[0].data.resetCode;
          _.delay(cb, config.passwordResetTimeoutMs * 2);
        }),
        cb => userManager.resetPassword(baseConnection, {
          username,
          resetCode,
          newPassword: 'catscatscats!!!',
        }, (err) => {
          assert.isOk(err);
          assert.match(err.message, /invalid reset code/i);
          return cb();
        }),
      ], cb);
    });

    it('should be able to update user information', (cb) => {
      const username = fakedata.Email();
      let initialVersion;
      async.series([
        cb => userManager.create(baseConnection, { username }, cb),
        cb => userManager.get(baseConnection, { username }, (err, userInfo, version) => {
          assert.isNotOk(err);
          assert.isOk(userInfo);
          initialVersion = version;
          // Make some changes to UserInfo.
          userInfo.name = 'A friendly name.';
          return userManager.update(baseConnection, userInfo, version, cb);
        }),
        cb => userManager.get(baseConnection, { username }, (err, newUserInfo, newVersion) => {
          assert.isNotOk(err);
          assert.strictEqual(newUserInfo.name, 'A friendly name.');
          assert.isFalse(newVersion === initialVersion);
          return cb();
        }),
      ], cb);
    });

    it('should fail user updates on conflicts', (cb) => {
      const username = fakedata.Email();
      let initialInfo, initialVersion;
      async.series([
        // Create a new user.
        cb => userManager.create(baseConnection, { username }, cb),

        // Make some changes to user's UserInfo and update.
        cb => userManager.get(baseConnection, { username }, (err, userInfo, version) => {
          assert.isNotOk(err);
          assert.isOk(userInfo);
          initialInfo = _.cloneDeep(userInfo);
          initialVersion = version;

          // Modify and update.
          userInfo.name = 'A friendly name.';
          userInfo.time = Date.now();
          return userManager.update(baseConnection, userInfo, version, cb);
        }),

        // Ensure get() reflects the new version.
        cb => userManager.get(baseConnection, { username }, (err, newUserInfo, newVersion) => {
          assert.isNotOk(err);
          assert.strictEqual(newUserInfo.name, 'A friendly name.');
          assert.notEqual(newVersion, initialVersion);
          return cb(err);
        }),

        // Attempt to update again with initial version, expect failure.
        (cb) => {
          const concurrentUpdate = _.cloneDeep(initialInfo);
          concurrentUpdate.name = 'A different name.';
          userManager.update(baseConnection, concurrentUpdate, initialVersion, (err) => {
            assert.isOk(err);
            assert.strictEqual(err.code, 'conflict');
            return cb();
          });
        },

        // Ensure initial version was not updated.
        cb => userManager.get(baseConnection, { username }, (err, newUserInfo) => {
          assert.isNotOk(err);
          assert.strictEqual(newUserInfo.name, 'A friendly name.');
          return cb(err);
        }),
      ], cb);
    });
  });

  describe('Session management: login, authorize, logout', () => {
    let username;

    beforeEach((cb) => {
      username = fakedata.Email();
      async.series([
        cb => userManager.create(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, cb),
      ], cb);
    });

    it('should not be able to login to with an invalid password', (cb) => {
      userManager.login(baseConnection, {
        username,
        password: 'barkbarkbark?',
      }, (err, userSession) => {
        assert.isOk(err);
        assert.isNotOk(userSession);
        assert.match(err.message, /invalid/i);
        return cb();
      });
    });

    it('should temporarily lock the account after too many bad login attempts', (cb) => {
      config.loginRateLimitCount = 2;
      config.loginRateLimitTimeMs = 500;

      async.series([
        cb => userManager.login(baseConnection, {
          username,
          password: 'barkbarkbark?',
        }, (err) => {
          assert.isOk(err);
          assert.match(err.message, /invalid/i);
          return cb();
        }),
        cb => userManager.login(baseConnection, {
          username,
          password: 'barkbarkbark?',
        }, (err) => {
          assert.isOk(err);
          assert.match(err.message, /invalid/i);
          return cb();
        }),
        cb => userManager.login(baseConnection, {
          username,
          password: 'barkbarkbark?',
        }, (err) => {
          assert.isOk(err);
          assert.match(err.message, /locked/i);
          _.delay(cb, config.loginRateLimitTimeMs * 2);
        }),
        cb => userManager.login(baseConnection, {
          username,
          password: 'barkbarkbark?',
        }, (err) => {
          assert.isOk(err);
          assert.match(err.message, /invalid/i);
          return cb();
        }),
      ], cb);
    });

    it('should be able to log in to a verified account with the correct password', (cb) => {
      userManager.login(baseConnection, {
        username,
        password: 'catscatscats!!!',
      }, (err, userSession) => {
        assert.isNotOk(err);
        assert.isOk(userSession);
        assert.isAbove(userSession.authToken.length, 5);
        assert.isAbove(userSession.expires, Date.now());
        return cb();
      });
    });

    it('should authorize a valid user session', (cb) => {
      let userSession;
      async.series([
        // Login successfully and get a userSession.
        cb => userManager.login(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, (err, session) => {
          assert.isNotOk(err);
          userSession = session;
          return cb();
        }),
        // Authorize using the userSession.
        cb => userManager.authorize(baseConnection, userSession, (err) => {
          assert.isNotOk(err);
          return cb();
        }),
      ], cb);
    });

    it('should not authorize a user session after it has logged out', (cb) => {
      let userSession;
      async.series([
        // Login successfully and get a userSession.
        cb => userManager.login(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, (err, session) => {
          assert.isNotOk(err);
          userSession = session;
          return cb();
        }),
        // Authorize using the userSession.
        cb => userManager.authorize(baseConnection, userSession, (err) => {
          assert.isNotOk(err);
          return cb();
        }),
        // Log the session out.
        cb => userManager.logout(baseConnection, userSession, (err) => {
          assert.isNotOk(err);
          return cb();
        }),
        // Ensure session does not re-authorize.
        cb => userManager.authorize(baseConnection, userSession, (err) => {
          assert.isOk(err);
          assert.match(err.message, /no such session/i);
          return cb();
        }),
      ], cb);
    });

    it('should delete the oldest sessions after session limit is reached', (cb) => {
      config.maxActiveSessions = 2;
      const userSessions = [];
      async.series([
        // Create first session.
        cb => userManager.login(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, (err, session) => {
          assert.isNotOk(err);
          userSessions.push(session);
          return cb();
        }),
        // Create second session.
        cb => userManager.login(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, (err, session) => {
          assert.isNotOk(err);
          userSessions.push(session);
          return cb();
        }),
        // Ensure first session can be authorized.
        cb => userManager.authorize(baseConnection, userSessions[0], cb),
        // Ensure second session can be authorized.
        cb => userManager.authorize(baseConnection, userSessions[1], cb),
        // Create third session.
        cb => userManager.login(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, (err, session) => {
          assert.isNotOk(err);
          userSessions.push(session);
          return cb();
        }),
        // Ensure first session *cannot* be authorized.
        cb => userManager.authorize(baseConnection, userSessions[0], (err) => {
          assert.isOk(err);
          assert.strictEqual(err.code, 'not_found');
          return cb();
        }),
        // Ensure second session can be authorized.
        cb => userManager.authorize(baseConnection, userSessions[1], cb),
        // Ensure third session can be authorized.
        cb => userManager.authorize(baseConnection, userSessions[2], cb),
      ], cb);
    });

    it('should reject an expired session', (cb) => {
      config.sessionDurationMs = 100;
      let userSession;
      async.series([
        // Login successfully and get a userSession.
        cb => userManager.login(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, (err, session) => {
          assert.isNotOk(err);
          userSession = session;
          return cb();
        }),
        // Authorize using the userSession.
        cb => userManager.authorize(baseConnection, userSession, (err) => {
          assert.isNotOk(err);
          _.delay(cb, config.sessionDurationMs * 2);
        }),
        // Attempt to authorize again, but session should have expired.
        cb => userManager.authorize(baseConnection, userSession, (err) => {
          assert.isOk(err);
          assert.strictEqual(err.code, 'not_found');
          return cb();
        }),
      ], cb);
    });

    it('should reject an invalid token', (cb) => {
      config.sessionDurationMs = 100;
      let userSession;
      async.series([
        // Login successfully and get a userSession.
        cb => userManager.login(baseConnection, {
          username,
          password: 'catscatscats!!!',
        }, (err, session) => {
          assert.isNotOk(err);
          userSession = _.cloneDeep(session);
          userSession.authToken = crypto.randomBytes(32).toString('base64');
          return cb();
        }),
        // Attempt to authorize with invalid token.
        cb => userManager.authorize(baseConnection, userSession, (err) => {
          assert.isOk(err);
          assert.strictEqual(err.code, 'not_found');
          return cb();
        }),
      ], cb);
    });
  });
});
