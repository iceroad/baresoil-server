const httpCodes = require('./http-codes'),
  wsCodes = require('./ws-codes')
;


module.exports = {
  not_found: {
    code: 'not_found',
    message: 'The resource you requested could not be found.',
    wsCloseCode: wsCodes.CLOSE_NORMAL,
    httpStatusCode: httpCodes.NOT_FOUND,
  },

  internal: {
    code: 'internal',
    message: 'The service is currently unavailable.',
    wsCloseCode: wsCodes.INTERNAL_ERROR,
    httpStatusCode: httpCodes.INTERNAL_ERROR,
  },

  forbidden: {
    code: 'forbidden',
    message: 'Request not allowed.',
    wsCloseCode: wsCodes.CLOSE_NORMAL,
    httpStatusCode: httpCodes.FORBIDDEN,
  },

  conflict: {
    code: 'conflict',
    message: 'Resource already exists.',
    httpStatusCode: httpCodes.CONFLICT,
    wsCloseCode: wsCodes.CLOSE_NORMAL,
  },

  bad_method: {
    code: 'bad_method',
    message: 'HTTP method not allowed for URL.',
    httpStatusCode: httpCodes.METHOD_NOT_ALLOWED,
    wsCloseCode: wsCodes.CLOSE_UNSUPPORTED,
  },

  modified: {
    code: 'modified',
    message: 'Resource has been modified by another client.',
    httpStatusCode: httpCodes.CONFLICT,
    wsCloseCode: wsCodes.CLOSE_NORMAL,
  },

  bad_request: {
    code: 'bad_request',
    message: 'Request was malformed.',
    httpStatusCode: httpCodes.BAD_REQUEST,
    wsCloseCode: wsCodes.CLOSE_PROTOCOL_ERROR,
  },

  timeout: {
    code: 'timeout',
    message: 'Requested timed out.',
    httpStatusCode: httpCodes.TIMEOUT,
    wsCloseCode: wsCodes.CLOSE_NORMAL,
  },
};
