"use strict";

// See ./README.md. Node variant: delegate to util.inspect.
const { inspect } = require("node:util");

exports.inspect = inspect;
