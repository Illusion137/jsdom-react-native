"use strict";

// See ./README.md. React Native variant: the runtime ships a global WebSocket. It does not support all
// of undici's options (e.g. a custom dispatcher or arbitrary request headers), but covers the common
// url + subprotocols case. We export it directly; React Native always defines it.
module.exports = { WebSocket: globalThis.WebSocket };
