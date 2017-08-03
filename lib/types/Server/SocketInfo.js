const field = require('../fields');

module.exports = {
  name: 'SocketInfo',
  desc: 'Raw TCP socket information.',
  type: 'object',
  fields: {
    connectedAt: field('Timestamp', {
      desc: 'Epoch timestamp when socket connected (milliseconds).',
    }),
    clientId: field('ClientId'),
    remoteAddress: field('RemoteAddress', {
      desc: 'Remote address on socket.',
    }),
  },
};
