"use strict";

// See ./README.md. Node variant: the built-in vm module, used to give a window its own realm and to run
// page scripts when the `runScripts` option is enabled.
module.exports = require("node:vm");
