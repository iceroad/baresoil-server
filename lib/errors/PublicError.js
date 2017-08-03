const _ = require('lodash'),
  assert = require('assert'),
  codes = require('./codes'),
  construct = require('runtype').construct
  ;


class PublicError extends Error {
  constructor(errcode, overrideObj) {
    super();
    assert(_.isString(errcode), 'Error code must be a string.');
    assert(codes[errcode], `Unknown error code ${errcode}`);
    Error.captureStackTrace(this, this.constructor);
    _.merge(this, codes[errcode], overrideObj);
    this.code = errcode;
  }

  isPublicError() {
    return true;
  }

  toProtocolArray() {
    return JSON.stringify(['error', construct('PublicError', this)]);
  }

  toJson() {
    return JSON.parse(JSON.stringify(this));
  }
}


PublicError.fromNativeException = function fromNativeException(exc) {
  console.error(exc);
  return new PublicError('internal', {
    exception: exc.message,
    exceptionStack: exc.stack.toString(),
  });
};


module.exports = PublicError;
