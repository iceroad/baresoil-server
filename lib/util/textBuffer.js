module.exports = function textBuffer(utf8Text) {
  return Buffer.from(utf8Text, 'utf-8');
};
