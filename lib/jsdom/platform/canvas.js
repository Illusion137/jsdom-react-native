"use strict";

// See ./README.md. Node variant: the optional `canvas` native addon, if the consumer installed it.
let Canvas;
try {
  Canvas = require("canvas");
} catch {
  Canvas = null;
}

module.exports = { Canvas };
