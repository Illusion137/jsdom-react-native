"use strict";

// See ./README.md. React Native variant: there is no portable synchronous filesystem, so loading
// resources from file: URLs is unsupported.
exports.createFileURLStream = () => {
  throw new Error("Loading resources from file: URLs is not supported in React Native.");
};
