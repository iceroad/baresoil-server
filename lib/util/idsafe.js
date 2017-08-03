function idsafe(inStr, maxLen) {
  let result = (inStr || '').replace(/\s/mg, '');
  if (maxLen) result = result.substr(0, maxLen);
  return result;
}

module.exports = idsafe;
