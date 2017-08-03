const _ = require('lodash'),
  assert = require('assert')
;

function serveClientFile(appConfig, baseConnection, req, res) {
  assert(this.isServer);
  return this.deps_.AppManager.getClientFile(baseConnection, req, (err, result) => {
    if (err) {
      return this.failHttpRequest(req, res, err);
    }

    //
    // We have a file that can be served, generate a base 200 HTTP response.
    //
    const fileMetadata = result.fileMetadata;
    const reqHeaders = _.mapValues(_.keyBy(baseConnection.headers, 'key'), 'value');
    const cacheTTLSec = fileMetadata.cacheMaxAgeSec || 0;
    const fileExpires = new Date(Date.now() + (cacheTTLSec * 1000)).toUTCString();
    const fileModified = new Date(fileMetadata.lastModified).toUTCString();
    const cacheControlStr = _.filter([
      'public',
      cacheTTLSec ? null : 'must-revalidate',
      `max-age=${cacheTTLSec || 0}`,
    ]).join(',');

    const httpResponse = {
      statusCode: 200,
      headers: {
        ETag: `"${fileMetadata.etag}"`,
        Expires: fileExpires,
        'Last-Modified': fileModified,
        'Cache-Control': cacheControlStr,
        'Content-Type': fileMetadata.mimeType,
      },
    };

    //
    // Check Etag/if-none-match and return HTTP 304 if unmodified.
    //
    const reqEtag = (reqHeaders['if-none-match'] || '').replace(/"/g, '');
    if (reqEtag && reqEtag === fileMetadata.etag) {
      // Etags match, return HTTP 304 Not Modified.
      httpResponse.statusCode = 304;
    } else {
      // Check If-Modified-Since and return HTTP 304 if unmodified.
      let ifModifiedSince;
      try {
        ifModifiedSince = new Date(reqHeaders.headers['if-modified-since']).getTime();
        ifModifiedSince += 999; // Due to conversion from seconds.
      } catch (e) {
        // Malformed date.
        ifModifiedSince = 0;
      }
      if (fileMetadata.lastModified < ifModifiedSince) {
        httpResponse.statusCode = 304;
      } else {
        // Return the file contents for HTTP GET.
        if (req.method === 'GET') {
          httpResponse.body = Buffer.from(result.fileBlob, 'base64');
          httpResponse.headers['Content-Length'] = fileMetadata.size;
        }
      }
    }

    //
    // Respond to the request.
    //
    try {
      res.writeHead(httpResponse.statusCode, httpResponse.headers);
    } catch (e) {
      console.warn(e);
    }
    try {
      if (httpResponse.body) {
        res.end(httpResponse.body);
      } else {
        res.end();
      }
    } catch (e) { }
  });
}

module.exports = serveClientFile;
