const field = require('../fields');

module.exports = {
  name: 'AppConfig',
  desc: 'Application configuration.',
  type: 'object',
  fields: {
    // App ID and hostname
    appId: field('AppId'),
    hostname: field('Hostname', { optional: true }),

    // Deployment history.
    deployments: {
      type: 'array',
      optional: true,
      desc: 'History of application code deployments.',
      elementType: field('AppDeployment'),
    },

    // App metadata.
    status: field('EntityStatus'),
    name: field('AppName', { optional: true }),

    // Sandbox options.
    sandbox: {
      type: 'object',
      optional: true,
      fields: {
        containerName: {
          type: 'string',
          desc: 'Sandbox container name.',
          optional: true,
          minLength: 1,
          maxLength: 256,
        },
        environment: field('SandboxEnvironmentVars', { optional: true }),
      },
    },

    // Server options.
    server: {
      type: 'object',
      desc: 'Options for the HTTP/WebSocket server.',
      optional: true,
      fields: {

        http: {
          type: 'object',
          optional: true,
          fields: {

            allowUploads: {
              type: 'boolean',
              desc: 'Whether to route HTTP POST and similar methods to a sandbox.',
              default: true,
            },
            uploadsUrlPrefix: {
              type: 'string',
              default: '/__bs__/post',
            },
          },
        },

        websocket: {
          type: 'object',
          optional: true,
          fields: {

            allowConnections: {
              type: 'boolean',
              desc: 'Whether to allow WebSocket connections for this app.',
              default: true,
            },

          },
        },
      },
    },

    // User access control.
    users: field('AppUserList', { optional: true }),
  },
};
