const assert = require('assert'),
  digest = require('../../../util/digest'),
  PublicError = require('../../../errors/PublicError')
  ;

function logout(baseConnection, userSession, cb) {
  assert(this.isUserManager);
  const userId = userSession.userId;
  const metaStore = this.metaStore_;

  return metaStore.execute({
    operation: 'get',
    table: 'users',
    id: userId,
  }, (err, item) => {
    if (err || !item.exists) {
      return cb(new PublicError('not_found', { message: 'Invalid session.' }));
    }

    // Filter out invalid sessions, including ones that matched the
    // supplied hashed authToken.
    const userInfo = item.value;
    const authToken = Buffer.from(userSession.authToken, 'base64');
    const hashedToken = digest(authToken).toString('base64');
    const sessions = userInfo.sessions;
    for (let i = 0; i < sessions.length; i++) {
      if ((sessions[i].expires && sessions[i].expires < Date.now()) ||  // expired
          sessions[i].hashedToken === hashedToken) {  // session to logout
        sessions.splice(i, 1);
        i--;
      }
    }

    return metaStore.execute({
      operation: 'update',
      table: 'users',
      id: userId,
      ifVersion: item.version,
      value: userInfo,
    }, err => cb(err));
  });
}

module.exports = logout;
