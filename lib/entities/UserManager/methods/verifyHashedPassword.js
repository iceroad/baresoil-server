const assert = require('assert'),
  crypto = require('crypto'),
  PublicError = require('../../../errors/PublicError')
  ;

module.exports = function verifyHashedPassword(clearPassword, hashedPassword, cb) {
  assert(
    hashedPassword.method === 'pbkdf2-sha256',
    `Unsupported password hash algorithm "${hashedPassword.method}".`);
  const salt = Buffer.from(hashedPassword.salt, 'base64');
  const iterations = hashedPassword.workFactor.iterations;
  return crypto.pbkdf2(clearPassword, salt, iterations, 32, 'sha256', (err, key) => {
    if (err) return cb(err);
    if (key.toString('base64') === hashedPassword.hash) {
      return cb();
    }
    return cb(new PublicError('forbidden', {
      message: 'Invalid password.',
    }));
  });
};
