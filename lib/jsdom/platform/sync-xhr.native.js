"use strict";

// See ./README.md. React Native variant: synchronous XMLHttpRequest requires blocking the JS thread
// until the response arrives (Node does this with a worker thread + Atomics.wait). React Native has no
// worker-thread/SharedArrayBuffer blocking mechanism, so synchronous XHR is unsupported. Asynchronous
// XMLHttpRequest works normally.

exports.sendSyncXHRRequest = () => {
  throw new Error(
    "Synchronous XMLHttpRequest (open(..., false)) is not supported in React Native. Use an asynchronous " +
    "request instead (the default)."
  );
};
