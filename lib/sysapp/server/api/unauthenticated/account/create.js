const assert = require('assert');

function create(ucRequest, cb) {
  this.syscall('UserManager', 'create', ucRequest, err => cb(err));
}

create.$schema = {
  arguments: [{ type: 'UserCreateRequest' }],
  callbackResult: [],
};

module.exports = create;
