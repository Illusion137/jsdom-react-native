"use strict";

// See ./README.md. Node variant: delegate to the built-in EventEmitter.
const { EventEmitter } = require("node:events");

module.exports = { EventEmitter };
