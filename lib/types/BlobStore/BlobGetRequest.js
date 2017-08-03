const field = require('../fields');

module.exports = {
  desc: 'Blob get request.',
  type: 'object',
  fields: {
    appId: field('AppId'),
    etag: field('FileDigest'),
  },
};
