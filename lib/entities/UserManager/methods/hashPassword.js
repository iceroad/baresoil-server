const assert = require('assert'),
  construct = require('runtype').construct,
  crypto = require('crypto'),
  field = require('../../../types/fields')
  ;

module.exports = function hashPassword(clearPassword, cb) {
  const passHashConfig = this.config_.passwordHash;
  const saltSizeBytes = passHashConfig.saltSizeBytes;
  const iterations = passHashConfig.iterations;
  const hashAlg = passHashConfig.algorithm;

  try {
    assert(
      hashAlg === 'pbkdf2-sha256',
      `Unsupported password hash algorithm "${hashAlg}".`);
    assert(iterations >= 100, 'Require at least 100 PBKDF2 iterations.');
    assert(saltSizeBytes >= 8, 'Require at least 8 bytes of salt.');
  } catch (e) { return cb(e); }

  const salt = crypto.randomBytes(saltSizeBytes);
  return crypto.pbkdf2(clearPassword, salt, iterations, 32, 'sha256', (err, key) => {
    if (err) return cb(err);
    const passHash = construct(field('HashedPassword'), {
      method: hashAlg,
      workFactor: {
        iterations,
      },
      salt: salt.toString('base64'),
      hash: key.toString('base64'),
      updated: Date.now(),
    });
    return cb(null, passHash);
  });
};
