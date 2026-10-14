"use strict";

// See ./README.md. React Native variant: approximate process.nextTick with a microtask so the
// callback runs after the current synchronous stack unwinds but before any timers.
const schedule = typeof queueMicrotask === "function" ?
  queueMicrotask :
  cb => Promise.resolve().then(cb);

exports.queueMicrotask = cb => schedule(cb);
