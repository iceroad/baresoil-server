module.exports = {
  Client: {
    Server: {

      // CLIENT -> SERVER: session_request
      session_request: {
        type: 'array',
        desc: 'First message for every new WebSocket connection.',
        elements: [
          {
            type: 'literal',
            value: 'session_request',
          },
          {
            type: 'SessionRequest',
          },
        ],
      },
    },
  },
};
