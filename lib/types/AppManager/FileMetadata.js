const field = require('../fields');

module.exports = {
  type: 'object',
  desc: 'File metadata.',
  fields: {
    path: field('FilePath'),
    mimeType: field('FileMimeType'),
    size: field('FileSize'),
    etag: field('FileDigest'),
    lastModified: field('Timestamp', {
      desc: 'Last modification time of file.',
    }),
    cacheMaxAgeSec: field('CacheTTL', {
      desc: 'For client-side files, enables HTTP caching of resource using a Max-Age directive.',
      optional: true,
    }),
  },
};
