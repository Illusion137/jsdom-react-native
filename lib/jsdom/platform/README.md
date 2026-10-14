# Platform abstraction layer

This directory isolates jsdom's dependencies on Node.js built-in modules and globals so the
library can also run under non-Node runtimes (primarily React Native / Metro).

Each capability is exposed as a module with two variants:

- `name.js` — the Node.js implementation, delegating to `node:*` built-ins. Used by Node and by
  bundlers that target Node.
- `name.native.js` — the React Native implementation. Metro resolves the `.native.js` extension in
  preference to `.js`, so React Native automatically picks these up with no consumer configuration.

Implementation code should `require("../platform/<name>")` (no extension) rather than reaching for
`node:*` modules directly, so the correct variant is chosen per platform.
