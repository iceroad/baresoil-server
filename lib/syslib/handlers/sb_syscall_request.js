const _ = require('lodash'),
  construct = require('runtype').construct
;

module.exports = function onSbSyscallRequest(baseConnection, syscallRequest) {
  const syslibModName = syscallRequest.module;
  const syslibFnName = syscallRequest.function;
  const syslibMod = this.deps[syslibModName];
  if (!syslibMod) {
    return this.failSyscall(
      baseConnection, syscallRequest,
      `Syslib module "${syslibMod}" does not exist.`);
  }

  // Get "syslib" portion of function schema.
  const syslibExports = syslibMod.$spec.syslib;
  const schema = _.get(syslibExports, syslibFnName);
  if (!_.isObject(schema)) {
    return this.failSyscall(
      baseConnection, syscallRequest,
      `Syslib function "${syslibModName}.${syslibFnName}" does not exist.`);
  }
  const sysFn = _.get(syslibMod, syslibFnName);
  if (!_.isFunction(sysFn)) {
    return this.failSyscall(
      baseConnection, syscallRequest,
      `Syslib function "${syslibModName}.${syslibFnName}" is invalid.`);
  }

  // Check argument.
  const fnArgSchema = schema.arguments;
  let argsArray;
  if (fnArgSchema) {
    try {
      argsArray = construct(fnArgSchema, syscallRequest.argsArray);
    } catch (e) {
      return this.failSyscall(
        baseConnection, syscallRequest,
        `Invalid syscall arguments: ${e.message}`);
    }
  } else {
    return this.failSyscall(baseConnection, syscallRequest,
      `Syslib function "${syslibModName}.${syslibFnName}" is forbidden.`);
  }

  // Call function asynchronously.
  try {
    argsArray.push((err, ...resultsArray) => {
      const syscallResponse = {
        requestId: syscallRequest.requestId,
      };
      if (err) {
        syscallResponse.error = err;
        try {
          syscallResponse.error = syscallResponse.error.toJson();
        } catch (e) { }
      } else {
        syscallResponse.resultsArray = resultsArray;
      }
      return this.emit(
        'sb_syscall_response', baseConnection.clientId, syscallResponse);
    });

    return sysFn.call(syslibMod, baseConnection, ...argsArray);
  } catch (e) {
    console.error(e);
    return this.failSyscall(
      baseConnection, syscallRequest,
      `Syscall threw an exception: ${e.message}`);
  }
};
