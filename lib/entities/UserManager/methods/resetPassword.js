const _ = require('lodash'),
  assert = require('assert'),
  construct = require('runtype').construct,
  PublicError = require('../../../errors/PublicError')
  ;

module.exports = function resetPassword(baseConnection, resetPasswordRequest, cb) {
  assert(this.isUserManager);
  const config = this.config_;
  const metaStore = this.metaStore_;

  return metaStore.execute({
    operation: 'get',
    table: 'users',
    key: resetPasswordRequest.username,
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
    if (passwordResetEvts.length > passwordResetLimitCount) {
      return cb(new PublicError('forbidden', {
        message: 'Account is temporarily locked.',
      }));
    }

    // Check for unexpired reset codes inside security events.
    const secEvt = _.find(userInfo.securityEvents, (secEvt) => {
      return (
          secEvt.eventType === 'password_reset_requested' &&
          _.get(secEvt, 'data.resetCode') === resetPasswordRequest.resetCode &&
          Date.now() - secEvt.time <= config.passwordResetTimeoutMs);
    });
    if (!secEvt) {
      // Add a password reset failed security event.
      userInfo.securityEvents.push(construct('AccountSecurityEvent', {
        eventType: 'password_reset_failed',
        remoteAddress: baseConnection.remoteAddress,
        time: Date.now(),
      }));

      // Update UserInfo in MetaStore and return error.
      return metaStore.execute({
        operation: 'update',
        table: 'users',
        key: resetPasswordRequest.username,
        ifVersion: item.version,
        value: userInfo,
      }, () => cb(new PublicError('forbidden', {
        message: 'Invalid reset code.',
      })));
    }

    // Make security event as being used by deleting "data".
    delete secEvt.data;

    // Hash password and store the new password.
    this.hashPassword(resetPasswordRequest.newPassword, (err, hashedPassword) => {
      if (err) return cb(err);

      // Set new hashed password.
      userInfo.hashedPassword = hashedPassword;

      // Delete existing user session.
      userInfo.sessions.splice(0, userInfo.sessions.length);

      // Mark account as verified.
      userInfo.verified = true;

      // Add a password reset success security event.
      userInfo.securityEvents.push(construct('AccountSecurityEvent', {
        eventType: 'password_reset_success',
        remoteAddress: baseConnection.remoteAddress,
        time: Date.now(),
      }));

      // Update UserInfo, return nothing.
      return metaStore.execute({
        operation: 'update',
        table: 'users',
        key: resetPasswordRequest.username,
        ifVersion: item.version,
        value: userInfo,
      }, err => cb(err));
    });
  });
};
