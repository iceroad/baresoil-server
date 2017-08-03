module.exports = {
  name: 'PublicError',
  desc: 'Error details.',
  type: 'object',
  fields: {
    code: {
      type: 'string',
      desc: 'Error code.',
    },
    message: {
      type: 'string',
      desc: 'Error description.',
    },
  },
};
