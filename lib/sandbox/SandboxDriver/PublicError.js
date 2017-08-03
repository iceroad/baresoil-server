const _ = require('lodash');

class PublicError extends Error {
  constructor(errcode, overrideObj) {
    super();
    Error.captureStackTrace(this, this.constructor);
    _.merge(this, overrideObj);
    this.code = errcode;
  }

  toJson() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

module.exports = PublicError;
