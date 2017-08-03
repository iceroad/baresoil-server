const field = require('../fields');

module.exports = {
  name: 'HttpResponse',
  desc: 'Response to an HTTP request from the web.',
  type: 'object',
  fields: {
    requestId: {
      type: 'integer',
      desc: 'Unique identifier for each HTTP request sent on socket.',
    },
    statusCode: field('HttpStatusCode'),
    headers: field('HttpHeaders'),
    body: {
      type: 'base64_buffer',
      optional: true,
    },
  },
};
