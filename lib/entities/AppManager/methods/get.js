const assert = require('assert'),
  idsafe = require('../../../util/idsafe'),
  PublicError = require('../../../errors/PublicError')
  ;

function get(baseConnection, appGetRequest, cb) {
  assert(this.isAppManager());

  const hostname = idsafe(appGetRequest.hostname, 255);
  const appId = appGetRequest.appId;
  if (!(hostname || appId)) {
    return cb(new PublicError('bad_request', {
      message: 'Must specify either "appId" or "hostname".',
    }));
  }

  const query = {
    operation: 'get',
    table: 'apps',
  };
  if (hostname) query.key = hostname;
  if (appId) query.id = appId;

  return this.metaStore_.execute(query, (err, item) => {
    if (err) return cb(err);
    if (!item.exists) {
      return cb(null, this.getSysappConfig(), 1);
    }
    return cb(null, item.value, item.version);
  });
}

module.exports = get;
