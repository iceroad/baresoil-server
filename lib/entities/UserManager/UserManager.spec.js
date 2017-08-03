const constants = require('../../util/constants'),
  def = require('runtype').schemaDef
;

module.exports = {
  deps: ['Config', 'MetaStore'],
  config: {
    type: 'object',
    desc: 'Options for an in-memory UserManager implementation.',
    fields: {
      loginRateLimitCount: {
        type: 'integer',
        desc: 'Maximum number of failed login attempts within a time window.',
        minValue: 10,
        maxValue: 100,
      },
      loginRateLimitTimeMs: {
        type: 'integer',
        desc: 'Time window within which to rate-limit login attempts.',
        minValue: 5 * constants.SECONDS,
        maxValue: 12 * constants.HOURS,
      },
      passwordResetLimitCount:  {
        type: 'integer',
        desc: 'Maximum number of password reset events within a time window.',
        minValue: 0,
        maxValue: 10,
      },
      passwordResetLimitTimeMs: {
        type: 'integer',
        desc: 'Time window within which to rate-limit password reset requests.',
        minValue: 5 * constants.SECONDS,
        maxValue: 12 * constants.HOURS,
      },
      passwordResetTimeoutMs: {
        type: 'integer',
        desc: 'Amount of time after which a password reset code is invalidated if unused.',
        minValue: 10 * constants.SECONDS,
        maxValue: 3 * constants.DAYS,
      },
      passwordHash: {
        type: 'object',
        desc: 'Parameters for password hashing algorithm.',
        fields: {
          algorithm: {
            type: 'factor',
            factors: ['pbkdf2-sha256'],
            desc: 'Password hashing algorithm.',
          },
          saltSizeBytes: {
            type: 'integer',
            desc: 'Size of random salt in bytes.',
            minValue: 8,
          },
          iterations: {
            type: 'integer',
            desc: 'Number of rounds of key stretching / work factor.',
          },
        },
      },
      maxActiveSessionsPerUser: {
        type: 'integer',
        desc: 'Maximum number of active logged-in sessions per user.',
        minValue: 1,
        maxValue: 1000,
      },
      sessionDurationMs: {
        type: 'integer',
        desc: 'Logged-in session duration; set to 0 for no expiration.',
        minValue: 0,
        maxValue: 30 * constants.DAYS,
      },
    },
  },
  defaults: {
    loginRateLimitCount: 20, // max. 20 login attempts...
    loginRateLimitTimeMs: 1 * constants.HOURS, // ... every hour.
    maxActiveSessionsPerUser: 10,
    passwordHash: {
      algorithm: 'pbkdf2-sha256',
      saltSizeBytes: 32,
      iterations: 1000000,
    },
    passwordResetLimitCount: 10, // max. 10 password reset events...
    passwordResetLimitTimeMs: 4 * constants.HOURS, // ...every 4 hours.
    passwordResetTimeoutMs: 6 * constants.HOURS,
    sessionDurationMs: 7 * constants.DAYS,
  },
  syslib: {
    authorize: {
      arguments: def.TypedArray([
        def.Type('UserSession'),
      ]),
    },
    create: {
      arguments: def.TypedArray([
        def.Type('UserCreateRequest'),
      ]),
    },
    get: {
      arguments: def.TypedArray([
        def.Type('UserGetRequest'),
      ]),
    },
    login: {
      arguments: def.TypedArray([
        def.Type('UserLoginRequest'),
      ]),
    },
    logout: {
      arguments: def.TypedArray([
        def.Type('UserSession'),
      ]),
    },
    resetPassword: {
      arguments: def.TypedArray([
        def.Type('ResetPasswordRequest'),
      ]),
    },
    sendPasswordReset: {
      arguments: def.TypedArray([
        def.Type('SendPasswordResetRequest'),
      ]),
    },
    update: {
      arguments: def.TypedArray([
        def.Type('UserInfo'),
      ]),
    },
  },
};
