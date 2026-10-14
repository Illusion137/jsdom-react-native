"use strict";

// See ./README.md. Node variant: process.nextTick drains before the next event-loop phase, which is
// the scheduling jsdom relies on here.
exports.queueMicrotask = cb => process.nextTick(cb);
