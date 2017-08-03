// Common fields that are used in many type schemas.
const _ = require('lodash'),
  assert = require('assert'),
  constants = require('../util/constants')
  ;

const AppId = {
  type: 'integer',
  desc: 'Unique application identifier.',
  minValue: 1,
  maxValue: Number.MAX_SAFE_INTEGER,
};

const AppName = {
  type: 'string',
  desc: 'Short name for application.',
  minLength: 1,
  maxLength: 64,
};

const AuthToken = {
  type: 'base64_buffer',
  desc: 'Authentication token (opaque).',
  minLength: 12,
  maxLength: 128,
};

const BlobId = {
  type: 'base64_buffer',
  desc: 'Blob identifier.',
  minLength: 8,
  maxLength: 256,
};

const CacheTTL = {
  type: 'integer',
  desc: 'Cache time-to-live.',
  minValue: 0,
};

const ClearPassword = {
  type: 'string',
  desc: 'Raw password in the clear (unhashed).',
  minLength: 6,
  maxLength: 128,
};

const ClientId = {
  type: 'hex_buffer',
  desc: 'Unique client identifier',
  minLength: 16,
  maxLength: 64,
};

const Digest256 = {
  type: 'base64_buffer',
  desc: '256-bit hash digest.',
  minLength: 1,
  maxLength: 44,
};

const Expires = {
  type: 'epoch_timestamp_ms',
  desc: 'Expiration timestamp in epoch milliseconds.',
};

const EntityStatus = {
  type: 'factor',
  desc: 'Current entity status.',
  factors: ['enabled', 'disabled', 'deleted'],
};

const FileDigest = {
  type: 'base64_buffer',
  desc: 'Content-based digest of file data.',
  minLength: 16,
  maxLength: 64,
};

const FilePath = {
  type: 'string',
  desc: 'Relative path and filename.',
  minLength: 1,
  maxLength: 256,
};

const FileMimeType = {
  type: 'string',
  desc: 'Mime type of file.',
  minLength: 5,
  maxLength: 50,
};

const FileSize = {
  type: 'integer',
  desc: 'File size in bytes.',
  minValue: 0,
};

const KVPair = {
  type: 'object',
  fields: {
    key: { type: 'string' },
    value: { type: 'string' },
  },
};

const HashedPassword = {
  type: 'object',
  desc: 'A hashed and salted password suitable for storage.',
  fields: {
    method: {
      type: 'string',
      desc: 'The method used to hash the password.',
      minLength: 1,
      maxLength: 20,
    },
    workFactor: {
      type: 'any',
      desc: 'Work factor / iterations used for hashing algorithm.',
    },
    salt: {
      type: 'base64_buffer',
      desc: 'Salt used for hashing.',
      minLength: 8,
      maxLength: 256,
    },
    hash: {
      type: 'base64_buffer',
      desc: 'Hashed password.',
      minLength: 16,
      maxLength: 1024,
    },
    updated: {
      type: 'epoch_timestamp_ms',
      desc: 'Time password was last udpated.',
    },
  },
};

const Hostname = {
  type: 'string',
  desc: 'Fully-qualified DNS host name.',
  minLength: 1,
  maxLength: 255,
};

const HttpHeaders = {
  type: 'object',
  desc: 'HTTP headers',
};

const HttpStatusCode = {
  type: 'integer',
  desc: 'Numeric HTTP status code',
  minValue: 100,
  maxValue: 599,
};

const Protocol = {
  type: 'factor',
  desc: 'Protocol used by client (WebSocket or HTTP).',
  factors: ['http', 'ws'],
};

const RemoteAddress = {
  type: 'ip_address',
  desc: 'Client IP address.',
  minLength: 7, // Min IPv4 length
  maxLength: 45, // Max IPv6 length
};

const RequestId = {
  type: 'integer',
  desc: 'A client-assigned request identifier that is returned with the response.',
  minValue: 1,
  maxValue: Number.MAX_SAFE_INTEGER,
};

const Timestamp = {
  type: 'epoch_timestamp_ms',
  desc: 'Timestamp in Unix epoch milliseconds.',
  minValue: 315532800000, // Jan 1 1980
  maxValue: 4638906061000, // Jan 1 2117
};

const UserData = {
  type: 'any',
  desc: 'Optional user data.',
  optional: true,
  maxSize: 128 * constants.KILOBYTES,
};

const Username = {
  desc: 'Globally unique username.',
  type: 'string',
  minLength: 3,
  maxLength: 254,
};

const UserId = {
  desc: 'User identifier.',
  type: 'integer',
  minValue: 1,
  maxValue: Number.MAX_SAFE_INTEGER,
};

// === Types with references to at least one of the types above.

const AppDeployment = {
  type: 'object',
  desc: 'Frontend or backend code push.',
  fields: {
    clientManifest: _.merge({}, BlobId, {
      desc: 'Blob identifier of web distribution manifest.',
      optional: true,
    }),
    message: {
      type: 'string',
      optional: true,
      desc: 'Comment describing this deployment.',
    },
    serverManifest: _.merge({}, BlobId, {
      desc: 'Blob identifier of server-side package manifest.',
      optional: true,
    }),
    serverPackage: _.merge({}, BlobId, {
      desc: 'Blob identifier of server-side package.',
      optional: true,
    }),
    remoteAddress: _.cloneDeep(RemoteAddress),
    time: _.cloneDeep(Timestamp),
    userId: _.merge({}, UserId, {
      desc: 'User who issued the deploy command.',
    }),
  },
};

const AppUserRole = {
  type: 'factor',
  desc: 'User permission level.',
  factors: [
    'owner',
  ],
};

const AppUserList = {
  type: 'array',
  desc: 'Users that are authorized to operate upon a application.',
  elementType: {
    type: 'object',
    fields: {
      userId: _.cloneDeep(UserId),
      role: _.cloneDeep(AppUserRole),
    },
  },
};


const UserAppList = {
  type: 'array',
  desc: 'Applications that this user has access to.',
  elementType: {
    type: 'object',
    fields: {
      appId: _.cloneDeep(AppId),
      role: _.cloneDeep(AppUserRole),
    },
  },
};


const FileManifest = {
  desc: 'Information about a set of files.',
  type: 'object',
  fields: {
    files: {
      type: 'array',
      desc: 'File list.',
      elementType: 'FileMetadata',
    },
  },
};

const SandboxEnvironmentVars = {
  type: 'array',
  desc: 'Environment variables for sandbox.',
  elementType: _.cloneDeep(KVPair),
};

const Fields = {
  AppDeployment,
  AppId,
  AppName,
  AppUserList,
  AuthToken,
  BlobId,
  CacheTTL,
  ClearPassword,
  ClientId,
  Digest256,
  EntityStatus,
  Expires,
  FileDigest,
  FileManifest,
  FilePath,
  FileMimeType,
  FileSize,
  HashedPassword,
  Hostname,
  HttpHeaders,
  HttpStatusCode,
  KVPair,
  Protocol,
  RemoteAddress,
  RequestId,
  SandboxEnvironmentVars,
  Timestamp,
  Username,
  UserAppList,
  UserData,
  UserId,
};

module.exports = function field(fieldName, overrides) {
  assert(Fields[fieldName], `Cannot find field ${fieldName}.`);
  return _.merge(_.cloneDeep(Fields[fieldName]), overrides);
};
