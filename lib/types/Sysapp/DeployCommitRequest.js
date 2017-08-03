module.exports = {
  desc: 'Request to commit an active deployment.',
  type: 'object',
  fields: {

    message: {
      type: 'string',
      desc: 'Message describing this deployment.',
      optional: true,
    },

    serverConfig: {
      type: 'object',
      desc: '"server" section of baresoil.json',
      optional: true,
    },

  },
};
