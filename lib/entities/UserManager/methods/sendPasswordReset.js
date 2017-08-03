const _ = require('lodash'),
  assert = require('assert'),
  construct = require('runtype').construct,
  PublicError = require('../../../errors/PublicError')
  ;

module.exports = function sendPasswordReset(baseConnection, sendPasswordResetRequest, cb) {
  assert(this.isUserManager);
  const config = this.config_;
  const metaStore = this.metaStore_;

  return metaStore.execute({
    operation: 'get',
    table: 'users',
    key: sendPasswordResetRequest.username,
  }, (err, item) => {
    if (err) return cb(err);

    if (!item.exists) {
      return cb(new PublicError('not_found', {
        message: 'Invalid username.',
      }));
    }
    const userInfo = item.value;

    // Rate limit password reset events.
    const passwordResetLimitCount = config.passwordResetLimitCount;
    const passwordResetLimitTimeMs = config.passwordResetLimitTimeMs;
    const passwordResetEvts = _.filter(userInfo.securityEvents, (secEvt) => {
      return (
          (secEvt.eventType === 'password_reset_requested' ||
           secEvt.eventType === 'password_reset_success' ||
           secEvt.eventType === 'password_reset_failed') &&
          Date.now() - secEvt.time <= passwordResetLimitTimeMs);
    });
    if (passwordResetEvts.length >= passwordResetLimitCount) {
      return cb(new PublicError('forbidden', {
        message: 'Account is temporarily locked.',
      }));
    }

    // Add a new password reset event to the security events array.
    userInfo.securityEvents.push(construct('AccountSecurityEvent', {
      eventType: 'password_reset_requested',
      remoteAddress: baseConnection.remoteAddress,
      time: Date.now(),
      data: {
        resetCode: _.random(1000, 9999999),
      },
    }));

    // .securityEvents is a circular array.
    const numSecEvents = userInfo.securityEvents.length;
    if (numSecEvents > 100) {
      userInfo.securityEvents.splice(0, numSecEvents - 100);
    }

    // TODO: send reset code via email.

    // Update UserInfo.
    metaStore.execute({
      operation: 'update',
      table: 'users',
      key: sendPasswordResetRequest.username,
      ifVersion: item.version,
      value: userInfo,
    }, err => cb(err));
  });
};
