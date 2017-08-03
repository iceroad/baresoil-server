class HRTimer {
  constructor() {
    this.start_ = process.hrtime();
  }

  stop() {
    const diff = process.hrtime(this.start_);
    return ((diff[0] * 1e9) + diff[1]) / 1e6;
  }
}

module.exports = function startHRTimer() {
  return new HRTimer();
};
