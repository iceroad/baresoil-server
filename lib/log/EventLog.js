const _ = require('lodash'),
  callsite = require('../util/callsite'),
  chalk = require('chalk'),
  murmurhash = require('murmurhash')
  ;

// Color palettes from:
// http://mkweb.bcgsc.ca/colorblind/img/colorblindness.palettes.trivial.png
const COLORS = [
  chalk.hex('#F1E545'),
  chalk.hex('#5BB5E2'),
  chalk.hex('#0773B3'),
  chalk.hex('#D25F26'),
  chalk.hex('#CC79A7'),
  chalk.hex('#4AD5F1'),
];

const EVENT_COLORS = {
  socket_start: COLORS[0],
  socket_end: COLORS[0],

  sandbox_start: COLORS[1],
  sandbox_end: COLORS[1],
  sandbox_exit: COLORS[1],
  sandbox_ready: COLORS[1].bold,
  sandbox_authorized: COLORS[1].bold,

  sandbox_read: COLORS[2],
  sandbox_write: COLORS[2],

  http_request: COLORS[3],
  http_response: COLORS[3],

  websocket_start: COLORS[4],
  websocket_end: COLORS[4],
  websocket_incoming: COLORS[4],

  syscall_request: COLORS[5],
  syscall_response: COLORS[5],
};

function getColor(key) {
  return COLORS[murmurhash.v3(key) % COLORS.length];
}

const SUMMARY_LEN = 140;

function truncate(str) {
  if (!str) return;
  if (str.length > SUMMARY_LEN) {
    const leftover = str.length - SUMMARY_LEN;
    str = (
      `${str.substr(0, SUMMARY_LEN).replace(/[\r\n]+$/mg, '')}` +
      `${chalk.blue(`…(${leftover} more)`)}`);
  }
  return str;
}

class EventLog {
  init(deps, cb) {
    this.enabled_ = (process.env.LOG === 'debug' || process.env.DEBUG);
    return cb();
  }

  destroy(deps, cb) {
    return cb();
  }

  enable() {
    this.enabled_ = true;
  }

  disable() {
    this.enabled_ = false;
  }

  callsite(...args) {
    return callsite(...args);
  }

  client(clientId, evtType, msg) {
    if (!this.enabled_) return;
    const cliCol = getColor(clientId);
    const evtCol = EVENT_COLORS[evtType] || chalk.gray;
    console.log(_.filter([
      cliCol(`${clientId.substr(0, 6)}…`),
      evtCol(evtType),
      truncate(msg),
    ]).join(' '));
  }
}


EventLog.prototype.$spec = {
  deps: ['Config'],
};


module.exports = EventLog;
