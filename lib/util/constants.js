const MILLISECONDS = 1;
const SECONDS = 1000 * MILLISECONDS;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;
const YEARS = 365 * DAYS;

const KILOBYTES = 1024;
const MEGABYTES = 1024 * KILOBYTES;
const GIGABYTES = 1024 * MEGABYTES;

const DEFAULT_CONFIG_FILE = 'baresoil-server.conf.json';
const PROVIDER_ENV_VAR = 'PROVIDER';

module.exports = {
  // Time
  MILLISECONDS,
  SECONDS,
  MINUTES,
  HOURS,
  DAYS,
  YEARS,

  // Size
  KILOBYTES,
  MEGABYTES,
  GIGABYTES,

  // Configuration constants
  DEFAULT_CONFIG_FILE,
  PROVIDER_ENV_VAR,
};
