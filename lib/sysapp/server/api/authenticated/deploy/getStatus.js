const _ = require('lodash'),
  assert = require('assert')
;

function getStatus(cb) {
  assert(this.$session);
  const stage = this.$stage;

  //
  // Only one deploy staged at a time per connection.
  //
  if (!stage || !stage.ready) {
    return cb(new Error('No deploy stage ready.'));
  }

  return cb(null, {
    clientManifest: {
      files: _.values(stage.clientManifest),
    },
    serverManifest: {
      files: _.values(stage.serverManifest),
    },
  });
}

getStatus.$schema = {
  arguments: [],
  callbackResult: [{ type: 'DeployStage' }],
};

module.exports = getStatus;
