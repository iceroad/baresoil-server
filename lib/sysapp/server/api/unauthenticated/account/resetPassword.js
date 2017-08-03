// ## Account Verification Request
//
// An unauthenticated remote client wants to 2FA-verify an account.
//
const _ = require('lodash'),
  async = require('async'),
  config = require('../../../config'),
  construct = require('runtype').construct,
  crypto = require('crypto'),
  def = require('runtype').schemaDef,
  emailutil = require('../../../util/email'),
  fields = require('../../../fields'),
  log = require('../../../log')
  ;


const GENERIC_FAIL_MSG = 'Could not reset your password.';


function resetPassword(resetReq, cb) {
  try {
    /* eslint-disable no-param-reassign */
    resetReq.email = emailutil.normalize(resetReq.email);
  } catch (e) {
    return cb(e);
  }
  const svclib = this.svclib;
  const email = resetReq.email;
  const baseConnection = this.baseConnection;
  const remoteAddress = baseConnection.remoteAddress;
  const smsAuthCode = resetReq.smsAuthCode;
  const emailAuthCode = resetReq.emailAuthCode;
  const clearPassword = resetReq.password;
  const now = Date.now();

  return async.auto({

    // Lookup user by email address.
    user(cb) {
      svclib.KVDataStore.get([{
        table: 'email_to_user',
        key: email,
      }], (err, items) => {
        if (err) return cb(err);
        if (!items[0].exists) {
          return cb(new Error(GENERIC_FAIL_MSG));
        }
        const userId = items[0].value.userId;
        svclib.KVDataStore.get([{
          table: 'users',
          key: _.toString(userId),
        }], (err, items) => {
          if (err) return cb(err);
          if (!items[0].exists) {
            return cb(new Error(GENERIC_FAIL_MSG));
          }
          const user = items[0].value;

          // Ensure that account does not have too many recent security events.
          const securityEvents = user.securityEvents = _.filter(
              user.securityEvents || [], (secEvtItem) => {
                const itemAgeMs = now - secEvtItem.time;
                return itemAgeMs < config.accounts.max_security_events_period;
              });
          if (securityEvents.length >= config.accounts.max_security_events_count) {
            return cb(new Error(
              'Too many recent security events for that account, ' +
              'please try again later, or contact support.'));
          }

          return cb(null, items[0]);
        });
      });
    },

    // Hash password while we wait for KVDataStore -- a little wasteful in cases
    // where the email has not been registered, but helps smooth out variance in
    // latency for positive/negative results.
    hashedPassword: ['user', (deps, cb) => {
      const salt = crypto.randomBytes(
          Math.max(32, config.accounts.salt_size_bytes));
      const iters = Math.max(5000, config.accounts.pbkdf2_iterations);
      return crypto.pbkdf2(clearPassword, salt, iters, 32, 'sha256', (err, key) => {
        if (err) return cb(err);
        const passHash = construct('HashedPassword', {
          iterations: iters,
          digest: 'sha256',
          salt: salt.toString('base64'),
          hash: key.toString('base64'),
        });
        return cb(null, passHash);
      });
    }],

    // Attempt to verify and then commit password reset.
    resetResult: ['user', 'hashedPassword', (deps, cb) => {
      const user = deps.user.value;
      let resetSuccess;

      // Look for security event in recent events history.
      const securityEvents = user.securityEvents;
      const matchedEvent = _.find(securityEvents, (secEvtItem) => {
        if (secEvtItem.type === 'request_password_reset' &&
            secEvtItem.smsAuthCode === smsAuthCode &&
            secEvtItem.emailAuthCode === emailAuthCode &&
            !secEvtItem.consumed) {
          return true;
        }
      });

      // Reset password if a valid 2FA combination exists.
      if (matchedEvent) {
        resetSuccess = true;
        matchedEvent.consumed = true;
        user.password = deps.hashedPassword;
        user.verified = true;
      }

      // Create new security event.
      const secEvt = construct('SecurityEvent', {
        time: now,
        type: `password_reset_${resetSuccess ? 'success' : 'failure'}`,
        remoteAddress,
      });
      securityEvents.push(secEvt);

      // Attempt to update user with password reset history.
      svclib.KVDataStore.update([deps.user], (err) => {
        if (err) return cb(err);

        // Send reset failure.
        if (!resetSuccess) {
          return cb(new Error(GENERIC_FAIL_MSG));
        }

        return cb();
      });
    }],

    authToken: ['resetResult', (deps, cb) => {
      // Call 'login' to create a new session for the user.
      const login = this.handlers.account.login;
      return login.call(this, {
        email,
        password: clearPassword,
      }, cb);
    }],

  }, (err, result) => {
    if (err) {
      log.raw({
        type: 'failed_password_reset',
        client: baseConnection,
        message: `Password reset failed for: ${email}`,
        json: {
          resetReq,
        },
      });
      return cb(err);
    }

    log.raw({
      type: 'password_reset_confirmed',
      client: baseConnection,
      message: `Codes verified and password reset: ${email}`,
      userId: _.get(result, 'user.value.userId'),
      json: {
        email,
      },
    });

    return cb(null, result.authToken);
  });
}


resetPassword.$schema = {
  arguments: [
    def.TypedObject({
      email: fields.Email({
        desc: 'Email address used to register account',
      }),
      smsAuthCode: fields.SmsAuthCode({
        optional: false,
      }),
      emailAuthCode: fields.EmailAuthCode({
        optional: false,
      }),
      password: fields.ClearPassword(),
    }),
  ],
  callbackResult: [
    { type: 'AuthToken' },
  ],
};

module.exports = resetPassword;
