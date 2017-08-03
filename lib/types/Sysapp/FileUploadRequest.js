const field = require('../fields');

module.exports = {
  desc: 'Request to upload a file to a deployment stage.',
  type: 'object',
  fields: {
    // Required
    component: {
      type: 'factor',
      desc: 'Component to upload the file to.',
      factors: ['server', 'client'],
    },
    data: {
      type: 'base64_buffer',
      desc: 'Contents of file.',
    },
    path: field('FilePath', {
      desc: 'Path and filename relative to component root directory.',
    }),

    // Optional
    cacheMaxAgeSec: field('CacheTTL', {
      desc: 'For client-side files, enables HTTP caching of resource using a Max-Age directive.',
      optional: true,
    }),
    lastModified: field('Timestamp', {
      desc: 'For client-side files, determines HTTP Expires header. Ignored for server-side files.',
      optional: true,
    }),
    mimeType: field('FileMimeType', {
      desc: 'Mime type of data (otherwise inferred from filename).',
      optional: true,
    }),
  },
};
