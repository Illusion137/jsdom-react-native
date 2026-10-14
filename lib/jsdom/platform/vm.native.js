"use strict";

// See ./README.md. React Native variant: Hermes/JSC have no equivalent of Node's `vm` module (separate
// realms + evaluation of code strings), and Hermes disables runtime code evaluation entirely. jsdom only
// reaches createContext/runInContext when the `runScripts` option is set, so constructing such a JSDOM on
// React Native fails fast with a clear message. A window created WITHOUT `runScripts` never touches vm and
// works normally (you can still parse and manipulate the DOM — you just cannot execute page scripts).

const UNSUPPORTED_MESSAGE =
  "Running scripts is not supported in React Native: the `runScripts` option requires Node's `vm` module, " +
  "which has no React Native equivalent (Hermes also disables runtime code evaluation). Omit `runScripts` to " +
  "parse and manipulate the DOM without executing page scripts.";

function unsupported() {
  throw new Error(UNSUPPORTED_MESSAGE);
}

module.exports = {
  createContext: unsupported,
  runInContext: unsupported,
  // No window is ever a vm context on React Native; makes getInternalVMContext() throw the normal
  // "not configured to allow script running" error rather than a vm-specific one.
  isContext: () => false,
  constants: { DONT_CONTEXTIFY: Symbol("DONT_CONTEXTIFY") }
};
