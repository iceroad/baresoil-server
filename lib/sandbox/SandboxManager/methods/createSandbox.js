const _ = require('lodash'),
  assert = require('assert'),
  states = require('../states'),
  stablejson = require('json-stable-stringify'),
  JSONSieve = require('../../../util/json-sieve')
  ;


module.exports = function createSandbox(baseConnection, appConfig, appPackage, cb) {
  assert(this.isSandboxManager());
  const cbOnce = _.once(cb);

  // Do nothing if a sandbox already exists for this clientId.
  const clientId = baseConnection.clientId;
  if (this.sandboxes_[clientId]) return cb();

  // Create a new sandbox for this client.
  const sandbox = this.sandboxes_[clientId] = {
    baseConnection,
    appConfig,
    appPackage,
    child: null,
    clientId,
    readyCallback: cbOnce,
    sieve: new JSONSieve(),
    startedAt: Date.now(),
    state: states.STARTING,
  };

  // this.logInject('runtime',
  // `Starting sandbox for remote client at ${baseConnection.remoteAddress}.`);
  this.clientLog_(clientId, 'sandbox_start', stablejson(appConfig));

  // Spawn sandbox child.
  const child = sandbox.child = this.spawnSandboxChild(baseConnection, appConfig);

  // Handle case of child not being able to spawn, or dying with an error.
  child.on('error', (err) => {
    this.clientLog_(clientId, 'sandbox_error', err.message);
    if (sandbox.state === states.STARTING) {
      sandbox.state = states.DEAD;
      return cb(err);
    }
  });

  // Emit child stderr stream verbatim.
  child.stderr.on('data', (dataChunk) => {
    const errStr = dataChunk.toString('utf-8');
    this.clientLog_(clientId, 'sandbox_stderr', errStr);
    this.emit('sandbox_stderr', clientId, errStr);
  });

  // Pass child stdout stream to JSON sieve.
  child.stdout.on('data', (dataChunk) => {
    sandbox.sieve.observe(dataChunk.toString('utf-8'));
  });

  // Hook up JSON sieve array outputs to onSandboxMessage() to handle incoming
  // protocol messages.
  sandbox.sieve.on('json_array', this.onSandboxMessage.bind(this, clientId));

  // Hook up JSON sieve raw line outputs to a sandbox_stdout emit event.
  sandbox.sieve.on('raw_line', (rawLineStr) => {
    this.emit('sandbox_stdout', clientId, rawLineStr);
  });

  // Explicitly ignore various stream error events so that an EPIPE
  // 'unhandled error event' exception doesn't bring the whole process down.
  const ignore = () => {};
  child.stdout.on('error', ignore);
  child.stdin.on('error', ignore);
  child.stderr.on('error', ignore);

  // Cleanup after child and its child streams have ended. This is slightly
  // more elaborate than necessary to accomodate some edge cases where
  // a stdio stream 'close' event is received after process 'exit'. Since we
  // flush the JSON sieve only when a close event is received, we want to make
  // sure that any lingering messages are received before a sandbox_end event
  // is emitted.
  let stdoutClosed = false, exitReceived = false;
  const exitInfo = {};
  const cleanupFn = () => {
    _.defer(() => {
      this.emit('sandbox_end', clientId, exitInfo);
    });
  };
  child.stdout.once('close', () => {
    stdoutClosed = true;
    sandbox.sieve.close();
    if (exitReceived) cleanupFn();
  });
  child.once('exit', (code, signal) => {
    sandbox.state = states.DEAD;
    exitInfo.code = code || 0;
    if (signal) exitInfo.signal = signal;
    exitReceived = true;
    if (stdoutClosed) cleanupFn();
    this.clientLog_(clientId, 'sandbox_exit', `code=${code} signal=${signal}`);
  });

  // Generate binary tarball packet prefixed with a 32-bit length counter.
  const lengthBuffer = Buffer.allocUnsafe(4);
  lengthBuffer.writeUInt32LE(appPackage.length);
  const bootstrap = Buffer.concat([lengthBuffer, appPackage], appPackage.length + 4);

  // Send bootstrap to init program as binary data.
  try {
    child.stdin.write(bootstrap);
  } catch (e) {
    console.error(`Cannot write binary bootstrap frame to sandbox: ${e.message}`);
  }
};
