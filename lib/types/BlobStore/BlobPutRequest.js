const field = require('../fields');

module.exports = {
  desc: 'Blob put request.',
  type: 'object',
  fields: {
    appId: field('AppId'),
    data: {
      type: 'base64_buffer',
      desc: 'Blob data',
    },
    etag: field('FileDigest'),
  },
};
