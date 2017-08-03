module.exports = {
  name: 'UserEvent',
  desc: 'An event generated by a server-side handler to be sent to a WebSocket client.',
  type: 'object',
  fields: {
    name: {
      type: 'string',
      maxLength: 256,
    },
    data: {
      type: 'any',
      optional: true,
    },
  },
};