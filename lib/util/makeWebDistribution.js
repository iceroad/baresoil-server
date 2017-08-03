const _ = require('lodash'),
  async = require('async'),
  fs = require('fs'),
  fstate = require('./fstate'),
  digest = require('./digest'),
  mime = require('mime-types')
  ;

module.exports = function makeWebDistribution(dirPath, cb) {
  fstate(dirPath, (err, files) => {
    if (err) return cb(err);

    const fileReaders = _.map(files, fileInfo => (cb) => {
      fs.readFile(fileInfo.absPath, (err, data) => {
        if (err) return cb(err);
        const fileMetadata = {
          path: fileInfo.path,
          mimeType: mime.lookup(fileInfo.name),
          size: data.length,
          etag: digest(data, 'base64'),
          lastModified: fileInfo.mtime.getTime(),
        };
        return cb(null, {
          path: fileInfo.relPath,
          fileMetadata,
          fileBlob: data.toString('base64'),
        });
      });
    });

    async.parallelLimit(fileReaders, 10, (err, fileList) => {
      if (err) return cb(err);
      return cb(null, _.keyBy(fileList, 'path'));
    });
  });
};
