const json = JSON.stringify,
  minimist = require('minimist'),
  readline = require('readline'),
  SandboxDriver = require('./SandboxDriver')
  ;


function main() {
  // Load userspace module from current working directory.
  const userModule = require(process.cwd());

  // Create a SandboxDriver instance for the user module.
  const sbDriver = new SandboxDriver(userModule);

  // Emit sandbox driver's emitted events messages to stdout as JSON.
  function relay(evtName) {
    sbDriver.on(evtName, (...evtArgs) => {
      evtArgs.splice(0, 0, evtName);
      console.log(json(evtArgs));
    });
  }
  relay('session_response');
  relay('http_response');
  relay('rpc_response');
  relay('user_event');
  relay('syscall_request');

  // Create line reader for stdin.
  const rl = readline.createInterface({ input: process.stdin });

  // Read protocol messages from stdin and pass them to the sandbox driver.
  rl.on('line', (lineStr) => {
    try {
      sbDriver.accept_(JSON.parse(lineStr));
    } catch (e) {
      console.error(`Received invalid input: "${lineStr.substr(0, 200)}"
Error: ${e}`);
    }
  });

  // Notify parent of ready state.
  console.log(json(['ready']));
}

if (require.main === module) {
  main(minimist(process.argv.slice(2)));
} else {
  module.exports = main;
}
