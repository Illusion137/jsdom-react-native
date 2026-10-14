"use strict";

// See ./README.md. React Native variant: the `canvas` package is a native (Cairo) addon with no React
// Native build, so <canvas> 2D rendering and bitmap image decoding are unavailable. jsdom already treats a
// null Canvas as "unsupported" and degrades gracefully. Importantly, returning null here also keeps Metro
// from trying to resolve the non-bundleable `canvas` module.
module.exports = { Canvas: null };
