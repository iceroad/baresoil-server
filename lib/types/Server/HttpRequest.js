const field = require('../fields');

module.exports = {
  name: 'HttpRequest',
  desc: 'Incoming HTTP POST/PUT/DELETE request received from the web.',
  type: 'object',
  fields: {
    requestId: {
      type: 'integer',
      desc: 'Unique identifier for each HTTP request sent on socket.',
    },
    method: {
      type: 'factor',
      desc: 'HTTP request method',
      factors: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    url: {
      type: 'string',
      desc: 'HTTP request URL',
      minLength: 1,
      maxLength: 2083,
    },
    files: {
      type: 'array',
      optional: true,
      elementType: {
        type: 'object',
        fields: {
          filename: {
            type: 'string',
            desc: 'Filename provided by client.',
          },
          mimeType: {
            type: 'string',
            desc: 'MIME type of file.',
          },
          size: {
            type: 'integer',
            desc: 'File binary size.',
          },
          data: {
            type: 'base64_buffer',
            desc: 'File contents in Base64 encoding.',
          },
        },
      },
    },
    body: {
      type: 'any',
      desc: 'Parsed HTTP request body.',
      optional: true,
    },
    cookies: {
      type: 'object',
      optional: true,
      desc: 'Map of cookie names to cookie values.',
    },
    headers: field('HttpHeaders'),
  },
};
