// Fake data. Fake! Sad!
const _ = require('lodash'),
  construct = require('runtype').construct,
  crypto = require('crypto'),
  runtype = require('runtype'),
  PublicError = require('../lib/errors/PublicError')
  ;

_.extend(runtype.library, require('../lib/types'));

function AppConfig() {
  return construct('AppConfig', {
    appId: _.random(1000, Number.MAX_SAFE_INTEGER),
    name: 'Test application',
    status: 'enabled',
    sandbox: {
      environment: [],
    },
  });
}

function Email() {
  return `${crypto.randomBytes(24).toString('hex')}@baresoil.test`;
}

function Hostname() {
  return `${crypto.randomBytes(12).toString('hex')}.baresoil.test`;
}

function RemoteAddress() {
  const r255 = _.random.bind(_, 1, 255);
  return [r255(), r255(), r255(), r255()].join('.');
}

function BaseConnection(appId, protocol) {
  return construct('BaseConnection', {
    appId: appId || _.random(1000, Number.MAX_SAFE_INTEGER),
    connectedAt: Date.now(),
    hostname: 'localhost',
    protocol: protocol || 'ws',
    clientId: crypto.randomBytes(16).toString('hex'),
    remoteAddress: RemoteAddress(),
  });
}

function RandomString(len) {
  return crypto.randomBytes(len / 2).toString('hex');
}

function RpcRequest() {
  return construct('RpcRequest', {
    requestId: _.random(1, Number.MAX_SAFE_INTEGER),
    function: 'sample-function',
    argument: {
      val: 123,
    },
  });
}

function RpcResponse(rpcReq) {
  return construct('RpcResponse', {
    requestId: rpcReq.requestId,
    function: 'sample-function',
    argument: {
      val: 123,
    },
  });
}

function SessionRequest() {
  return construct('SessionRequest', {
    userData: {
      nested: {
        inner: 123,
      },
    },
  });
}

function SessionResponse(authResult) {
  return construct('SessionResponse', {
    auth: authResult ? true : false,
    error: authResult ? undefined : new PublicError('forbidden'),
    userData: authResult ? {
      nested: {
        inner: 123,
      },
    } : undefined,
  });
}

function UserEvent() {
  return construct('UserEvent', {
    name: 'sample_event',
    data: _.random(1, Number.MAX_SAFE_INTEGER),
  });
}

module.exports = {
  AppConfig,
  BaseConnection,
  Email,
  Hostname,
  RandomString,
  RemoteAddress,
  RpcRequest,
  RpcResponse,
  SessionRequest,
  SessionResponse,
  UserEvent,
};
