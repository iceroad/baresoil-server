const _ = require('lodash'),
  assert = require('assert'),
  async = require('async'),
  construct = require('runtype').construct,
  crypto = require('crypto'),
  digest = require('../../../util/digest'),
  idsafe = require('../../../util/idsafe'),
  PublicError = require('../../../errors/PublicError')
  ;

function login(baseConnection, userLoginRequest, cb) {
  assert(this.isUserManager);
  const config = this.config_;
  const metaStore = this.metaStore_;

  const username = idsafe(userLoginRequest.username, 254);
  const clearPassword = idsafe(userLoginRequest.password, 254);
  if (!username || !clearPassword) {
    return cb(new PublicError('bad_request', {
      message: 'Invalid username or password.',
    }));
  }

  return async.auto({
    //
    // Get UserInfo from metadata store.
    //
    userInfo: cb => metaStore.execute({
      operation: 'get',
      table: 'users',
      key: username,
    }, (err, item) => {
      if (err || !item.exists) {
        return cb(new PublicError('not_found', {
          message: 'Invalid username or password.',
        }));
      }
      return cb(null, item);
    }),

    //
    // Rate-limit account login events.
    //
    rateLimit: ['userInfo', (deps, cb) => {
      const userInfo = deps.userInfo.value;

      // Rate limit account login events.
      const loginLimitCount = config.loginRateLimitCount;
      const loginLimitTimeMs = config.loginRateLimitTimeMs;
      const badLoginEvents = _.filter(userInfo.securityEvents, (secEvt) => {
        return (
          secEvt.eventType === 'login_failed' &&
          Date.now() - secEvt.time <= loginLimitTimeMs);
      });

      if (badLoginEvents.length >= loginLimitCount) {
        return cb(new PublicError('forbidden', {
          message: 'Account is temporarily locked.',
        }));
      }

      return cb();
    }],

    //
    // Verify the password in the login request with the stored version
    // and create a new session if they match.
    //
    session: ['rateLimit', (deps, cb) => {
      const password = userLoginRequest.password;
      const userId = deps.userInfo.id;
      const userInfo = deps.userInfo.value;
      const hashedPassword = userInfo.hashedPassword;

      if (!hashedPassword) {
        return cb(new PublicError('forbidden', {
          message: 'No password set for account.',
        }));
      }

      this.verifyHashedPassword(password, hashedPassword, (err) => {
        if (err) {
          // Password verification error, add "login_failed" event to
          // UserInfo.securityEvents.
          userInfo.securityEvents.push(construct('AccountSecurityEvent', {
            eventType: 'login_failed',
            time: Date.now(),
            remoteAddress: baseConnection.remoteAddress,
          }));

          // Update UserInfo in MetaStore and return error.
          return metaStore.execute({
            operation: 'update',
            table: 'users',
            id: userId,
            ifVersion: deps.userInfo.version,
            value: userInfo,
          }, () => cb(err));
        }

        // Passwords matched, create and return session.
        const authToken = crypto.randomBytes(32);
        const hashedToken = digest(authToken);
        const userSession = construct('UserSession', {
          authToken: authToken.toString('base64'),
          expires: Date.now() + config.sessionDurationMs,
          userId,
        });

        // Hash the cryptographically random token and store its hash.
        const userSessionHashed = construct('UserSessionHashed', {
          hashedToken: hashedToken.toString('base64'),
          expires: userSession.expires,
          remoteAddress: baseConnection.remoteAddress,
          userId,
        });
        userInfo.sessions.push(userSessionHashed);

        // Keep only the maxActiveSessions most recent sessions.
        const numSessions = userInfo.sessions.length;
        if (numSessions > config.maxActiveSessions) {
          userInfo.sessions.splice(0, numSessions - config.maxActiveSessions);
        }

        // Update hashed user session in UserInfo and return unhashed user session.
        return metaStore.execute({
          operation: 'update',
          table: 'users',
          id: userId,
          ifVersion: deps.userInfo.version,
          value: userInfo,
        }, err => cb(err, userSession));
      });
    }],
  }, (err, results) => cb(err, err ? undefined : results.session));
}

module.exports = login;
