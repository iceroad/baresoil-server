// Picks out non-empty, line-delimited JSON arrays in a data stream, and
// parses the rest into lines.
//
// __Warning:__ Note that JSON will not be parsed if it is "pretty-printed"
// with whitespace.
//
const EventEmitter = require('events');

class JSONSieve extends EventEmitter {
  constructor() {
    super();
    this.lineBuffer_ = '';
  }

  // After construction, chunked data may be passed to `observe()`.
  observe(dataStr) {
    this.lineBuffer_ += dataStr;
    this.parseLineBuffer_();
  }

  // On every chunk, we add the new data to the existing line buffer,
  // and attempting to find newlines to split on. If there are no newlines,
  // then assume that the last chunk we got was a partial line.
  parseLineBuffer_() {
    const lines = [];
    let dataStr = this.lineBuffer_;
    let idx = dataStr.indexOf('\n');
    while (idx >= 0) {
      lines.push(dataStr.substr(0, idx));  // Excludes terminating new line.
      dataStr = dataStr.substr(idx + 1);   // Skip newline.
      idx = dataStr.indexOf('\n');
    }
    this.lineBuffer_ = dataStr;            // Linebuffer contains leftovers.
    if (lines.length) {
      lines.forEach(this.processLine_, this);
    }
  }

  // For every line parsed out of the stream, attempt to decode JSON strings
  // and arrays. A decision is made here not to attempt to decode JSON strings
  // and numbers, because they are too common.
  processLine_(line) {
    // Allow some fuzz in the input in the form of trailing whitespace.
    const trimmedLine = line.replace(
        /^[\s\u0000-\u001f]*|[\s\u0000-\u001f]*$/g, '');

    // Check for necessary conditions for non-empty, line-delimited JSON arrays.
    const len = trimmedLine.length;
    if (len >= 3) {
      // Test for possible line-delimited JSON arrays.
      if (trimmedLine[0] === '[' && trimmedLine[len - 1] === ']') {
        let jsonArr;
        try {
          jsonArr = JSON.parse(trimmedLine);
        } catch (e) { }  // Nope, not a JSON array.
        if (jsonArr && typeof jsonArr === 'object' && jsonArr.length) {
          return this.emit('json_array', jsonArr);
        }
      }
    }

    // Emit as a raw line.
    return this.emit('raw_line', line);
  }

  // Finish up any remaining data remaining in the line buffer, usually the
  // last line of output if it does not have a terminating newline.
  close() {
    if (this.lineBuffer_) {
      this.processLine_(this.lineBuffer_);
      delete this.lineBuffer_;
    }
  }
}

module.exports = JSONSieve;
