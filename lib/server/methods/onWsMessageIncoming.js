const _ = require('lodash'),
  assert = require('assert'),
  construct = require('runtype').construct,
  protocol = require('../../protocol'),
  states = require('../states'),
  PublicError = require('../../errors/PublicError')
  ;


module.exports = function onWsMessageIncoming(clientId, messageStr) {
  assert(this.isServer());
  assert(_.isString(clientId));
  assert(_.isString(messageStr));

  this.clientLog_(clientId, 'websocket_incoming', messageStr);

  // Update stats.
  this.stats_.incomingMessages++;
  this.stats_.incomingBytes += messageStr.length;

  // Retrieve client from global registry.
  const client = this.clients_.wsConnections[clientId];
  if (!client) {
    console.warn(`Cannot find client ${clientId}, dropping message.`);
    return;
  }

  // Ignore empty lines.
  if (!messageStr.length) {
    return;
  }

  // Parse message.
  let inArray;
  // Decode JSON-encoded array.
  try {
    inArray = JSON.parse(messageStr);
    if (!inArray || !_.isArray(inArray) || !inArray.length) {
      throw new Error();
    }
  } catch (e) {
    return this.terminateWebSocket(clientId, new PublicError('bad_request', {
      message: (
        'Invalid protocol message. Please send line-delimited, compact JSON ' +
        'arrays with at least 1 element.'),
    }));
  }

  // Sandstone protocol state machine.
  switch (client.state) {
    case states.HANDSHAKE:
    case states.SETUP:
      // Only allow a single incoming "session_request" in the handshake phase.
      if (client.sessionRequest) {
        return this.terminateWebSocket(clientId, new PublicError('bad_request', {
          message: 'Already sent handshake frame, please wait for "session_response" first.',
        }));
      }

      // Check "session_request" schema and save the handshake.
      try {
        client.sessionRequest = construct(protocol.Client.Server.session_request, inArray)[1];
        client.sessionRequest.headers = client.headers;
      } catch (e) {
        return this.terminateWebSocket(clientId, new PublicError('bad_request', {
          message: `Cannot parse session request: ${e.message}.`,
        }));
      }

      // Received a handshake, clear the handshake timeout.
      clearTimeout(client.timeouts.handshake);
      delete client.timeouts.handshake;

      // Emit event if AppConfig has been validated.
      if (client.baseConnection) {
        // Already have AppConfig, so emit session_request.
        client.state = states.SETUP;
        this.emit(
          'ws_session_request', client.baseConnection, client.sessionRequest);
      }
      break;

    case states.READY:
      // Terminate any clients that do not send "rpc_request" messages.
      try {
        if (inArray[0] !== 'rpc_request') {
          throw new Error('Expected an "rpc_request" command.');
        }
        this.emit('ws_rpc_request', clientId, construct('RpcRequest', inArray[1]));
      } catch (e) {
        return this.terminateWebSocket(clientId, new PublicError('bad_request', {
          message: e.message,
        }));
      }
      break;

    case states.SHUTDOWN:
      // Drop message.
      break;

    default:
      // Drop message.
      console.error(`Invalid client state "${client.state}".`);
      break;
  }
};
