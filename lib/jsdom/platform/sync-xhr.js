"use strict";

// See ./README.md. Node variant: synchronous XMLHttpRequest requires blocking the calling thread until
// the response arrives. We do this with a persistent worker thread plus Atomics.wait, delegating the
// actual (async) fetch to ../living/xhr/xhr-sync-worker.js. This whole mechanism is Node-specific; the
// React Native variant reports that sync XHR is unsupported.

const { Worker, receiveMessageOnPort, MessageChannel } = require("node:worker_threads");

const syncWorkerFile = require.resolve("../living/xhr/xhr-sync-worker.js");

let syncWorker = null;

function getSyncWorker() {
  if (!syncWorker) {
    syncWorker = new Worker(syncWorkerFile);
    syncWorker.unref();
    syncWorker.on("exit", () => {
      syncWorker = null;
    });
  }
  return syncWorker;
}

const SYNC_WORKER_TIMEOUT_MS = 2 * 60 * 1000;

// Sends a serialized XHR request to the persistent worker thread and synchronously blocks
// until it responds. The synchronization works as follows:
//
// - A SharedArrayBuffer is shared between the main thread and the worker, used as a signal.
// - Atomics.wait() blocks the main thread until the worker writes to the shared buffer.
// - The worker does the actual async fetch, then posts the response via a MessagePort and
//   signals completion by writing to the SharedArrayBuffer with Atomics.store()/notify().
// - After waking, receiveMessageOnPort() synchronously reads the response from the port.
function sendSyncXHRRequest(config) {
  const sharedBuffer = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sharedBuffer);
  const { port1, port2 } = new MessageChannel();

  getSyncWorker().postMessage({ sharedBuffer, responsePort: port2, config }, [port2]);

  const waitResult = Atomics.wait(int32, 0, 0, SYNC_WORKER_TIMEOUT_MS);
  if (waitResult === "timed-out") {
    throw new Error("Sync XHR worker timed out");
  }

  const msg = receiveMessageOnPort(port1);
  if (!msg) {
    throw new Error("No response received from sync XHR worker");
  }
  return msg.message;
}

exports.sendSyncXHRRequest = sendSyncXHRRequest;
