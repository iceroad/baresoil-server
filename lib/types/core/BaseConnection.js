const field = require('../fields');

module.exports = {
  name: 'BaseConnection',
  desc: 'Client connection identifier.',
  type: 'object',
  fields: {
    hostname: field('Hostname', {
      desc: 'Hostname requested by client.',
    }),
    appId: field('AppId', {
      desc: 'Application ID connection is mapped to.',
    }),
    connectedAt: field('Timestamp', {
      desc: 'Epoch timestamp when client connected (milliseconds).',
    }),
    clientId: field('ClientId'),
    protocol: field('Protocol'),
    remoteAddress: field('RemoteAddress'),
  },
};
