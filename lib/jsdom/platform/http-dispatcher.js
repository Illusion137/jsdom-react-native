"use strict";

// See ./README.md. Node variant: undici provides both the Dispatcher base class (which JSDOMDispatcher
// extends) and the global network transport.
const { Dispatcher, getGlobalDispatcher } = require("undici");

module.exports = { Dispatcher, getGlobalDispatcher };
