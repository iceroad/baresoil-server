const _ = require('lodash'),
  assert = require('assert'),
  digest = require('../../../util/digest'),
  PublicError = require('../../../errors/PublicError')
  ;

function authorize(baseConnection, userSession, cb) {
  assert(this.isUserManager);
  const metaStore = this.metaStore_;

  return metaStore.execute({
    operation: 'get',
    table: 'users',
    id: _.toInteger(userSession.userId),
  }, (err, item) => {
    if (err || !item || !item.exists) {
      return cb(new PublicError('not_found', { message: 'Invalid user.' }));
    }
    const userInfo = item.value;

    // Find a stored session that matches the authToken supplied.
    const authToken = Buffer.from(userSession.authToken, 'base64');
    const hashedToken = digest(authToken).toString('base64');
    const session = _.find(userInfo.sessions, (session) => {
      return (
        session.hashedToken === hashedToken &&
        (!session.expires || session.expires > Date.now()));
    });
    if (!session) {
      return cb(new PublicError('not_found', { message: 'No such session.' }));
    }

    // Found a valid session.
    return cb(null, userSession);
  });
}

module.exports = authorize;
