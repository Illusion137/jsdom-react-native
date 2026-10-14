"use strict";

// See ./README.md. React Native variant: a minimal Readable covering only what jsdom's synthetic-response
// path (stream-handler.js) and request interceptor need: buffered chunks delivered as `data` events
// followed by `close`, plus pause/resume/destroy. There is no real backpressure or incremental sourcing
// because the platform's fetch buffers responses anyway.

const schedule = typeof queueMicrotask === "function" ?
  queueMicrotask :
  cb => Promise.resolve().then(cb);

class Readable {
  #listeners = new Map();
  #chunks = [];
  #paused = false;
  #flowScheduled = false;
  #sourceDone = false;

  constructor() {
    this.errored = null;
    this.readableEnded = false;
    this.destroyed = false;
  }

  on(event, fn) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, []);
    }
    this.#listeners.get(event).push(fn);
    if (event === "data") {
      this.#maybeFlow();
    }
    return this;
  }

  removeListener(event, fn) {
    const arr = this.#listeners.get(event);
    if (arr) {
      const index = arr.indexOf(fn);
      if (index !== -1) {
        arr.splice(index, 1);
      }
    }
    return this;
  }

  #emit(event, arg) {
    const arr = this.#listeners.get(event);
    if (arr) {
      for (const fn of arr.slice()) {
        fn(arg);
      }
    }
  }

  pause() {
    this.#paused = true;
    return this;
  }

  resume() {
    this.#paused = false;
    this.#maybeFlow();
    return this;
  }

  isPaused() {
    return this.#paused;
  }

  _push(chunk) {
    this.#chunks.push(chunk);
    this.#maybeFlow();
  }

  _finish() {
    this.#sourceDone = true;
    this.#maybeFlow();
  }

  #maybeFlow() {
    if (this.#flowScheduled || this.destroyed || this.#paused || !this.#listeners.has("data")) {
      return;
    }
    this.#flowScheduled = true;
    schedule(() => this.#drain());
  }

  #drain() {
    this.#flowScheduled = false;
    while (!this.#paused && !this.destroyed && this.#chunks.length > 0) {
      this.#emit("data", this.#chunks.shift());
    }
    if (this.destroyed || this.#paused) {
      return;
    }
    if (this.#sourceDone && this.#chunks.length === 0 && !this.readableEnded) {
      this.readableEnded = true;
      this.#emit("end");
      this.#emit("close");
    }
  }

  destroy(reason) {
    if (this.destroyed) {
      return this;
    }
    this.destroyed = true;
    if (reason) {
      this.errored = reason instanceof Error ? reason : new Error(String(reason));
      this.#emit("error", this.errored);
    }
    this.#emit("close");
    return this;
  }

  // Build a stream from an array/iterable of chunks (Uint8Array).
  static from(iterable) {
    const stream = new Readable();
    for (const chunk of iterable) {
      stream.#chunks.push(chunk);
    }
    stream._finish();
    return stream;
  }

  // Build a stream by draining a WHATWG ReadableStream (e.g. a fetch Response body).
  static fromWeb(webStream) {
    const stream = new Readable();
    (async () => {
      const reader = webStream.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            stream._push(value);
          }
        }
        stream._finish();
      } catch (error) {
        stream.destroy(error);
      }
    })();
    return stream;
  }
}

module.exports = { Readable };
