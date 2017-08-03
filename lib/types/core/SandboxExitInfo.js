module.exports = {
  type: 'object',
  name: 'SandboxExitInfo',
  desc: 'Information about a sandbox exit event.',
  fields: {
    code: {
      type: 'integer',
      desc: 'Numeric exit code for sandbox. 0 = normal termination.',
    },
    signal: {
      type: 'string',
      optional: true,
      desc: 'Operating system signal that killed the sandbox.',
    },
  },
};
