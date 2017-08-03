module.exports = function fqdnescape(inStr) {
  return (inStr || '')
    .replace(/\s/gm, '')    // no whitespace
    .replace(/:.*/, '')     // drop port number if specified
    .toLowerCase()          // case insensitive, as per DNS spec
    .substr(0, 255);        // maximum domain + subdomain length
};
