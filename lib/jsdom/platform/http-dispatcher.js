"use strict";

// See ./README.md. Node variant: undici provides both the Dispatcher base class (which JSDOMDispatcher
// extends) and the global network transport.
const { Dispatcher, getGlobalDispatcher } = require("undici");

// Undici's (undocumented) handler-API adapters. JSDOMDispatcher uses WrapHandler.wrap to normalize incoming
// handlers to the new onRequestStart/onResponse* API, and UnwrapHandler.unwrap to downgrade to the old
// onConnect/onHeaders/onData API before handing off to a global dispatcher that may be an older undici major.
const WrapHandler = require("undici/lib/handler/wrap-handler.js");
const UnwrapHandler = require("undici/lib/handler/unwrap-handler.js");

module.exports = { Dispatcher, getGlobalDispatcher, WrapHandler, UnwrapHandler };
