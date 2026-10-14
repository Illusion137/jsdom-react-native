"use strict";

// See ./README.md. React Native variant: reimplement the slice of undici's Dispatcher API that jsdom
// relies on, backed by the platform's global `fetch`.
//
// jsdom's own JSDOMDispatcher (lib/jsdom/browser/resources/jsdom-dispatcher.js) sits on top of this and
// handles redirects, CORS, cookies, and preflight itself using the handler-callback protocol
// (onRequestStart / onResponseStart / onResponseData / onResponseEnd / onResponseError). All this module
// has to provide is:
//   1. a `Dispatcher` base class exposing `request()` (and `compose`/`close`/`destroy`) in terms of an
//      abstract `dispatch()`, exactly as undici's base class does; and
//   2. `getGlobalDispatcher()`, returning a transport whose `dispatch()` performs one real network request
//      via `fetch` and emits the handler-callback protocol.
//
// Known limitations versus the Node/undici transport (RN `fetch` cannot express these):
//   - Redirects are followed by the platform, so JSDOMDispatcher's per-hop cookie capture and redirect-time
//     CORS checks do not run; only the final response is observed.
//   - Response bodies are buffered (no incremental streaming); the whole body arrives as one chunk.
//   - `Set-Cookie` visibility depends on the platform's fetch implementation.

function concatUint8Arrays(chunks) {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.byteLength;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

// Mirrors the consumable body of an undici response: async-iterable (used by XHR's `for await`) with
// `bytes()` / `arrayBuffer()` / `text()` collectors (used by fetchCollected).
class ResponseBody {
  #chunks = [];
  #error = null;
  #donePromise;
  #resolveDone;

  constructor() {
    this.#donePromise = new Promise(resolve => {
      this.#resolveDone = resolve;
    });
  }

  _push(chunk) {
    this.#chunks.push(chunk);
  }

  _end() {
    this.#resolveDone();
  }

  _fail(error) {
    this.#error = error;
    this.#resolveDone();
  }

  async #collect() {
    await this.#donePromise;
    if (this.#error) {
      throw this.#error;
    }
    return concatUint8Arrays(this.#chunks);
  }

  async bytes() {
    return this.#collect();
  }

  async arrayBuffer() {
    const bytes = await this.#collect();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  async text() {
    const bytes = await this.#collect();
    return typeof TextDecoder === "function" ? new TextDecoder().decode(bytes) : String.fromCharCode(...bytes);
  }

  async* [Symbol.asyncIterator]() {
    await this.#donePromise;
    if (this.#error) {
      throw this.#error;
    }
    for (const chunk of this.#chunks) {
      yield chunk;
    }
  }
}

class Dispatcher {
  // Subclasses must implement dispatch(opts, handler) -> boolean.
  dispatch() {
    throw new Error("Dispatcher#dispatch must be implemented by a subclass");
  }

  // Collects a full response from a single dispatch, matching undici's Dispatcher#request shape closely
  // enough for jsdom (statusCode, statusText, headers, body, context).
  request(opts) {
    return new Promise((resolve, reject) => {
      const body = new ResponseBody();
      let settled = false;
      let context = {};

      this.dispatch(opts, {
        onRequestStart(controller, ctx) {
          if (ctx) {
            // Store the reference; JSDOMDispatcher mutates ctx.finalURL after redirects resolve.
            context = ctx;
          }
        },
        onResponseStart(controller, statusCode, headers, statusText) {
          settled = true;
          resolve({ statusCode, statusText: statusText || "", headers, context, body });
        },
        onResponseData(controller, chunk) {
          body._push(chunk);
        },
        onResponseEnd() {
          body._end();
        },
        onResponseError(controller, error) {
          if (settled) {
            body._fail(error);
          } else {
            reject(error);
          }
        }
      });
    });
  }

  // undici's compose applies interceptors outermost-first over this dispatcher. jsdom only composes its
  // own JSDOMDispatcher, so this base implementation exists only for API completeness.
  compose(...interceptors) {
    const flat = interceptors.flat();
    let dispatch = (opts, handler) => this.dispatch(opts, handler);
    for (let i = flat.length - 1; i >= 0; i--) {
      const next = dispatch;
      dispatch = (opts, handler) => flat[i](next)(opts, handler);
    }
    const composed = new Dispatcher();
    composed.dispatch = dispatch;
    return composed;
  }

  close() {}
  destroy() {}

  get closed() {
    return false;
  }

  get destroyed() {
    return false;
  }
}

function headersToObject(input) {
  if (!input) {
    return {};
  }
  if (typeof input[Symbol.iterator] === "function" && typeof input !== "string") {
    const obj = {};
    for (const [name, value] of input) {
      obj[name] = value;
    }
    return obj;
  }
  return { ...input };
}

function responseHeadersToObject(headers) {
  const result = {};
  for (const [name, value] of headers) {
    result[name] = value;
  }
  // Preserve multiple Set-Cookie values where the platform exposes them.
  if (typeof headers.getSetCookie === "function") {
    const cookies = headers.getSetCookie();
    if (cookies.length > 0) {
      result["set-cookie"] = cookies;
    }
  }
  return result;
}

// The platform's global fetch, backing the default transport.
class FetchDispatcher extends Dispatcher {
  dispatch(opts, handler) {
    const urlString = opts.opaque?.url || (opts.origin + opts.path);
    const abortController = new AbortController();
    let aborted = false;

    const controller = {
      abort(reason) {
        aborted = true;
        abortController.abort(reason);
      },
      pause() {},
      resume() {},
      get paused() {
        return false;
      },
      get aborted() {
        return aborted;
      },
      get reason() {
        return abortController.signal.reason;
      },
      get rawHeaders() {
        return [];
      },
      get rawTrailers() {
        return [];
      }
    };

    if (opts.signal) {
      if (opts.signal.aborted) {
        handler.onResponseError?.(controller, opts.signal.reason);
        return true;
      }
      opts.signal.addEventListener("abort", () => controller.abort(opts.signal.reason), { once: true });
    }

    handler.onRequestStart?.(controller, {});
    if (aborted) {
      return true;
    }

    const init = {
      method: opts.method || "GET",
      headers: headersToObject(opts.headers),
      signal: abortController.signal
    };
    if (opts.body !== undefined && opts.body !== null) {
      init.body = opts.body;
    }

    globalThis.fetch(urlString, init).then(async response => {
      if (aborted) {
        return;
      }
      handler.onResponseStart?.(
        controller,
        response.status,
        responseHeadersToObject(response.headers),
        response.statusText
      );

      const buffer = new Uint8Array(await response.arrayBuffer());
      if (aborted) {
        return;
      }
      if (buffer.byteLength > 0) {
        handler.onResponseData?.(controller, buffer);
      }
      handler.onResponseEnd?.(controller, {});
    }).catch(error => {
      if (!aborted) {
        handler.onResponseError?.(controller, error);
      }
    });

    return true;
  }
}

let globalDispatcher = null;

function getGlobalDispatcher() {
  if (globalDispatcher === null) {
    if (typeof globalThis.fetch !== "function") {
      throw new Error(
        "jsdom's resource loading requires a global `fetch`. React Native provides one by default; " +
        "ensure it has not been removed."
      );
    }
    globalDispatcher = new FetchDispatcher();
  }
  return globalDispatcher;
}

// Handler-API adapters. On RN there is no undici, and every handler jsdom hands to JSDOMDispatcher — plus the
// FetchDispatcher transport below — already speaks the new onRequestStart/onResponse* API, so both adapters are
// identity passthroughs. (Undici needs them only to bridge its old onConnect/onHeaders/onData handler API.)
const WrapHandler = { wrap: handler => handler };
const UnwrapHandler = { unwrap: handler => handler };

module.exports = { Dispatcher, getGlobalDispatcher, WrapHandler, UnwrapHandler };
