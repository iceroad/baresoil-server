const _ = require('lodash'),
  assert = require('assert'),
  EventEmitter = require('events'),
  PublicError = require('./PublicError')
  ;


class SandboxDriver extends EventEmitter {
  constructor(userModule) {
    super();
    this.userModule_ = userModule;
    this.syscallBacks_ = {};
    this.nextSyscallId_ = 1;
  }

  sendEvent(evtName, evtData) {
    assert(_.isString(evtName) && evtName);
    this.emit('user_event', {
      name: evtName,
      data: evtData,
    });
  }

  syscall(moduleName, functionName, ...fnArgs) {
    assert(_.isString(moduleName) && moduleName, 'module name must be a string');
    assert(_.isString(functionName) && functionName, 'function name must be a string');
    assert(fnArgs.length && _.isFunction(_.last(fnArgs)), 'syscall() requires a callback');
    const cb = _.last(fnArgs);
    fnArgs.splice(fnArgs.length - 1, 1);

    const requestId = ++this.nextSyscallId_;
    this.syscallBacks_[requestId] = cb;
    const syscallRequest = {
      requestId,
      module: moduleName,
      function: functionName,
      argsArray: fnArgs,
    };

    this.emit('syscall_request', syscallRequest);
  }

  getUserModule() {
    return this.userModule_;
  }

  getRemoteAddress() {
    try {
      return JSON.parse(process.env.BASE_CONNECTION).remoteAddress;
    } catch (e) {
      return '0.0.0.0';
    }
  }

  invoke_(cmdPath, cmdArg, cb) {
    assert(this.isSandboxDriver);
    const userFn = _.get(this.userModule_, cmdPath);
    if (!_.isFunction(userFn)) {
      return cb(new PublicError('not_found', {
        message: `Function "${cmdPath}" not found.`,
      }));
    }
    if (_.isFunction(cmdArg) && _.isUndefined(cb)) {
      cb = cmdArg;
      cmdArg = undefined;
    }
    assert(_.isFunction(cb), 'require callback');
    const argList = _.filter([
      cmdArg,
      (err, result) => {
        if (err) {
          return cb(new PublicError(err.code || 'internal', {
            message: err.message,
          }));
        }
        return cb(null, result);
      },
    ]);
    try {
      userFn.call(this, ...argList);
    } catch (e) {
      console.error(e);
      return cb(new PublicError('exception', {
        message: `Function "${cmdPath}" threw an exception.`,
      }));
    }
  }

  accept_(inArray) {
    assert(_.isArray(inArray) && inArray.length, 'Input is not a valid array.');
    const cmd = inArray[0];

    // For "rpc_request", "session_request", and "http_request", pick a handler
    // function from the user module.
    if (cmd === 'rpc_request' || cmd === 'session_request' || cmd === 'http_request') {
      let cmdPath, cmdArg;
      if (cmd === 'session_request') {
        cmdPath = '$websocket';
        cmdArg = inArray[1];
      }
      if (cmd === 'http_request') {
        cmdPath = '$http';
        cmdArg = inArray[1];
      }
      if (cmd === 'rpc_request') {
        cmdPath = inArray[1].function;
        cmdArg = inArray[1].argument;
      }
      return this.invoke_(cmdPath, cmdArg, (pubErr, result) => {
        if (cmd === 'session_request') {
          if (pubErr) {
            return this.emit('session_response', {
              auth: false,
              error: pubErr.toJson(),
            });
          }
          return this.emit('session_response', {
            auth: true,
            userData: result,
          });
        }
        if (cmd === 'http_request') {
          if (pubErr) {
            console.error(pubErr.message);
            return this.emit('http_response', {
              requestId: cmdArg.requestId,
              statusCode: 500,
              body: Buffer.from(pubErr.message, 'utf-8').toString('base64'),
              headers: {
                'Content-Type': 'text/plain',
              },
            });
          }
          const httpResponse = result || {};
          httpResponse.requestId = cmdArg.requestId;
          httpResponse.headers = httpResponse.headers || {};
          httpResponse.statusCode = httpResponse.statusCode || 500;
          if (Buffer.isBuffer(httpResponse.body)) {
            httpResponse.body = httpResponse.body.toString('base64');
          }
          return this.emit('http_response', httpResponse);
        }
        if (cmd === 'rpc_request') {
          if (pubErr) {
            return this.emit('rpc_response', {
              requestId: inArray[1].requestId,
              error: pubErr.toJson(),
            });
          }
          return this.emit('rpc_response', {
            requestId: inArray[1].requestId,
            result,
          });
        }
      });
    }

    // For "shutdown", emit the "shutdown" event.
    if (cmd === 'shutdown') {
      return this.emit('shutdown');
    }

    // For "syscall_response", invoke the saved callback.
    if (cmd === 'syscall_response') {
      const syscallResponse = inArray[1];
      const requestId = syscallResponse.requestId;
      const cb = this.syscallBacks_[requestId];
      if (!cb) {
        console.error(
          `Received "syscall_response" for unknown request ${requestId}.`);
        return;
      }
      delete this.syscallBacks_[requestId];
      if (syscallResponse.error) {
        return cb(syscallResponse.error);
      }
      const resultsArray = syscallResponse.resultsArray || [];
      return cb(null, ...resultsArray);
    }

    console.error(`Unrecognized command ${cmd}.`);
  }

  isSandboxDriver() {
    return true;
  }
}

module.exports = SandboxDriver;
