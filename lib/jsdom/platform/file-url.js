"use strict";

// See ./README.md. Node variant: read a file: URL from the filesystem as a stream.
const fs = require("node:fs");
const { fileURLToPath } = require("node:url");

exports.createFileURLStream = serializedURL => fs.createReadStream(fileURLToPath(serializedURL));
