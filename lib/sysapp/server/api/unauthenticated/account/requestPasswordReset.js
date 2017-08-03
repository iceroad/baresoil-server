// ## Account Creation Request
//
// An unauthenticated remote client wants to register an account.
//
const _ = require('lodash'),
  async = require('async'),
  config = require('../../../config'),
  def = require('runtype').schemaDef,
  emailutil = require('../../../util/email'),
  fields = require('../../../fields'),
  log = require('../../../log'),
  phoneutil = require('../../../util/phone')
  ;


function requestPasswordReset(resetRequest, cb) {
  const email = emailutil.normalize(resetRequest.email);
  const svclib = this.svclib;
  const baseConnection = this.baseConnection;
  const remoteAddress = baseConnection.remoteAddress;

  return async.auto({
    //
    // Lookup user by email address.
    //
    user(cb) {
      svclib.KVDataStore.get([{
        table: 'email_to_user',
        key: email,
      }], (err, items) => {
        if (err) return cb(err);
        if (!items[0].exists) {
          return cb(new Error('That user does not exist.'));
        }
        const userId = items[0].value.userId;
        svclib.KVDataStore.get([{
          table: 'users',
          key: _.toString(userId),
        }], (err, items) => {
          if (err) return cb(err);
          if (!items[0].exists) {
            return cb(new Error('That user does not exist.'));
          }
          return cb(null, items[0]);
        });
      });
    },

    //
    // Create password reset entry in security events.
    //
    resetCodes: ['user', (deps, cb) => {
      const user = deps.user.value;
      const emailAuthCode = _.random(10000, 999999); // human-readable range.
      const smsAuthCode = _.random(10000, 999999); // human-readable range.
      const now = Date.now();

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

      // Create new security event.
      const secEvt = {
        time: now,
        type: 'request_password_reset',
        remoteAddress,
        smsAuthCode,
        emailAuthCode,
      };
      securityEvents.push(secEvt);

      // Attempt to update User with password reset history.
      svclib.KVDataStore.update([deps.user], (err) => {
        if (err) return cb(err);
        return cb(null, {
          smsAuthCode,
          emailAuthCode,
        });
      });
    }],

    // Send SMS notification.
    sendSms: ['resetCodes', (deps, cb) => {
      // Send 2fa sms.
      return phoneutil.send2FAMessage(
        deps.user.value.cellphone,
        deps.resetCodes.smsAuthCode,
        remoteAddress,
        cb);
    }],

    // Send email notification.
    sendEmail: ['resetCodes', (deps, cb) => {
      // Send 2fa email.
      return emailutil.send2FAEmail(
        deps.user.value.email,
        deps.resetCodes.emailAuthCode,
        remoteAddress,
        cb);
    }],

  }, (err, result) => {
    if (err) {
      log.raw({
        type: 'password_reset_denied',
        client: baseConnection,
        message: `Password reset denied for: ${email}: ${err.message}`,
        json: {
          email,
          error: err.message,
          stack: err.stack.toString(),
        },
      });
      return cb(err);
    }

    log.raw({
      type: 'password_reset_request',
      client: baseConnection,
      message: `Password reset codes sent for: ${email}`,
      userId: _.get(result, 'user.value.userId'),
      json: {
        email,
      },
    });

    return cb(); // Return nothing on success.
  });
}


requestPasswordReset.$schema = {
  arguments: [
    def.TypedObject({
      email: fields.Email({
        desc: 'Email address used to register account',
      }),
    }),
  ],
  callbackResult: [],
};


module.exports = requestPasswordReset;
