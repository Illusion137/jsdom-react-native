"use strict";

// See ./README.md. Node variant: report the number of logical CPUs.
const os = require("node:os");

exports.getHardwareConcurrency = () => os.cpus().length;
