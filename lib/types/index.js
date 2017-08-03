const _ = require('lodash');
module.exports = _.cloneDeep(_.extend(...[
  {},
  require('./core'),
  require('./AppManager'),
  require('./BlobStore'),
  require('./MetaStore'),
  require('./Sysapp'),
  require('./UserManager'),
  require('./Server'),
]));
