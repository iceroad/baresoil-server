module.exports = {
  $websocket(sessionRequest, cb) {
    if (sessionRequest.userData.fail) {
      return cb(new Error('refusing websocket session on client request.'));
    }
    return cb(null, {
      someUserData: 123,
    });
  },

  $http(httpRequest, cb) {
    return cb(null, {
      requestId: httpRequest.requestId,
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
        'X-Some-Header': 'gargleblaster',
      },
      body: Buffer.from('Hello, world!', 'utf-8').toString('base64'),
    });
  },

  nested: {
    echo(fnArg, cb) {
      return cb(null, fnArg);
    },

    returnError(fnArg, cb) {
      return cb(new Error('native error returned'));
    },

    throwException() {
      throw new Error('native error thrown');
    },
  },

  sendUserEvent(fnArg, cb) {
    this.sendEvent('my_event', {
      myData: 123,
    });
    return cb();
  },
};
