"use strict";

// See ./README.md. React Native variant: the `events` npm package is a pure-JS, API-compatible
// port of Node's EventEmitter that runs under Hermes/JSC.
const EventEmitter = require("events");

module.exports = { EventEmitter: EventEmitter.EventEmitter || EventEmitter };
