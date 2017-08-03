const assert = require('assert');

function create(appCreateRequest, cb) {
  assert(this.$session);
  appCreateRequest.userId = this.$session.userId;
  this.syscall('AppManager', 'create', appCreateRequest, cb);
}

create.$schema = {
  arguments: [{ type: 'AppCreateRequest' }],
  callbackResult: [{ type: 'AppConfig' }, { type: 'base64_buffer' }],
};

module.exports = create;
