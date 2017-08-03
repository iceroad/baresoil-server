const constants = require('../util/constants'),
  def = require('runtype').schemaDef,
  field = require('../types/fields'),
  path = require('path'),
  os = require('os')
  ;

module.exports = {
  deps: ['Config', 'AppManager', 'EventLog'],
  config: {
    type: 'object',
    desc: 'Options for an in-process WebSocket and HTTP server implementation.',
    fields: {
      port: {
        type: 'integer',
        desc: 'Network port for server to listen on.',
        minValue: 0,
        maxValue: 65535,
      },
      address: {
        type: 'string',
        desc: 'Network interface to bind to.',
      },
      errorTemplatePug: {
        type: 'string',
        optional: true,
        desc: 'Path to custom Pug template for system-level error pages.',
      },
      trustProxyHeaders: {
        type: 'boolean',
        desc: 'If true, will use the X-Forwarded-For HTTP header to determine ' +
              'remote IP address. If false, will use the connection\'s remote address.',
      },
      http: {
        type: 'object',
        desc: 'Options for the HTTP POST (multipart upload and form data) parser.',
        fields: {
          urlPrefix: {
            type: 'string',
            optional: true,
            desc: 'If specified, request URLs must match this prefix string.',
          },
          uploadsDirectory: {
            type: 'string',
            desc: 'Local directory to temporarily store file uploads.',
          },
          maxBodySizeBytes: {
            type: 'integer',
            desc: 'Maximum size of request body.',
          },
          maxFilesPerUpload: {
            type: 'integer',
            desc: 'Maximum number of files per multipart upload.',
          },
          allowedMethods: {
            type: 'array',
            desc: 'List of allowed HTTP methods.',
          },
        },
      },
      websocket: {
        type: 'object',
        desc: 'Options for WebSocket clients.',
        endpoint: {
          type: 'string',
          desc: 'URL path to WebSocket endpoint.',
          minLength: 1,
          maxLength: 128,
        },
        maxMessageSizeBytes: {
          type: 'integer',
          desc: 'Maximum size of an incoming data frame, in bytes.',
        },
        maxSessionDurationMs: {
          type: 'integer',
          desc: 'Maximum duration of a WebSocket connection.',
          minValue: 100 * constants.MILLISECONDS,
        },
        handshakeTimeoutMs: {
          type: 'integer',
          desc: 'Amount of time to wait for handshake frame from a WebSocket client.',
          minValue: 100 * constants.MILLISECONDS,
        },
        socketCleanupTimeMs: {
          type: 'integer',
          desc: 'Number of milliseconds to wait for socket cleanup before hard termination.',
        },
        perMessageDeflate: {
          type: 'boolean',
          desc: 'Whether to enable the permessage-deflate WebSocket extension for clients that support it.',
        },
      },
    },
  },
  defaults: {
    address: '127.0.0.1',
    port: 8086,
    trustProxyHeaders: false,
    http: {
      uploadsDirectory: os.tmpdir(),
      maxBodySizeBytes: 32 * constants.MEGABYTES,
      maxFileSizeBytes: 32 * constants.MEGABYTES,
      maxFilesPerUpload: 10,
      urlPrefix: '/__bs__/',
      allowedMethods: [
        'OPTIONS',
        'GET',
        'HEAD',
        'POST',
        'PUT',
        'DELETE',
      ],
    },
    websocket: {
      endpoint: '/__bs__/live',
      handshakeTimeoutMs: 15 * constants.SECONDS,
      maxMessageSizeBytes: 32 * constants.MEGABYTES,
      maxSessionDurationMs: 10 * constants.MINUTES,
      socketCleanupTimeMs: 200 * constants.MILLISECONDS,
      perMessageDeflate: true,
    },
  },
  emit: {
    http_request: [def.Type('BaseConnection'), def.Type('HttpRequest')],
    ws_session_request: [def.Type('BaseConnection'), def.Type('SessionRequest')],
    ws_rpc_request: [field('ClientId'), def.Type('RpcRequest')],
    ws_session_end: [field('ClientId')],
    socket_start: [field('ClientId'), def.Type('SocketInfo')],
    socket_end: [field('ClientId'), def.Type('SocketInfo')],
  },
  accept: {
    http_response: [field('ClientId'), def.Type('HttpResponse')],
    ws_session_response: [field('ClientId'), def.Type('SessionResponse')],
    ws_rpc_response: [field('ClientId'), def.Type('RpcResponse')],
    ws_user_event: [field('ClientId'), def.Type('UserEvent')],
    ws_sandbox_exit: [field('ClientId'), def.Type('any')],
  },
};
