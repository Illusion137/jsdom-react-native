"use strict";

// See ./README.md. Node variant: delegate to node:crypto.
const nodeCrypto = require("node:crypto");

exports.randomFillSync = array => nodeCrypto.randomFillSync(array);
exports.randomUUID = () => nodeCrypto.randomUUID();
