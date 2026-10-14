"use strict";

// React Native variant of ./decompress-interceptor.js. The platform's native networking layer transparently
// decompresses gzip/deflate responses (and strips Content-Encoding) before they reach JavaScript, so there is
// nothing for jsdom to do. This passthrough keeps the interceptor contract while avoiding node:zlib/node:stream.
//
// Caveat: content encodings the platform does not handle natively (notably Brotli) are left untouched.

function createDecompressInterceptor() {
  return dispatch => (opts, handler) => dispatch(opts, handler);
}

module.exports = createDecompressInterceptor;
