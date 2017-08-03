const field = require('../fields');

module.exports = {
  desc: 'A security-related account event.',
  type: 'object',
  fields: {
    eventType: {
      type: 'factor',
      desc: 'Security event type.',
      factors: [
        'login_failed',
        'login_success',
        'password_reset_requested',
        'password_reset_success',
        'password_reset_failed',
      ],
    },
    remoteAddress: field('RemoteAddress'),
    time: {
      type: 'epoch_timestamp_ms',
      desc: 'Time of security event.',
    },
    data: {
      type: 'any',
      optional: true,
      desc: 'Security event data',
    },
  },
};
