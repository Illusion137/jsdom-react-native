"use strict";

// See ./README.md. Node variant: synchronous XMLHttpRequest requires blocking the calling thread until
// the response arrives. We do this with a persistent worker thread plus Atomics.wait, delegating the
// actual (async) fetch to ./xhr-sync-worker.js. This whole mechanism is Node-specific; the React Native
// variant reports that sync XHR is unsupported.

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

// How long to wait for the worker to acknowledge it received our message. This detects the race
// where the worker called process.exit() (idle timeout) but the main thread hasn't processed the
// exit event yet — so getSyncWorker() returns a dead worker and postMessage() silently succeeds
// but the message is never delivered.
const SYNC_WORKER_ACK_TIMEOUT_MS = 5000;

// Sends a serialized XHR request to the persistent worker thread and synchronously blocks
// until it responds. Uses a two-phase protocol:
//
// 1. Ack phase: the worker writes 1 to sharedBuffer[0] immediately upon receiving the message.
//    If this times out, the worker is assumed dead and we retry with a fresh worker.
// 2. Done phase: the worker writes 1 to sharedBuffer[1] after posting the response to the
//    MessagePort. After waking, receiveMessageOnPort() synchronously reads the response.
function sendSyncXHRRequest(config) {
  const result = trySendSyncWorkerRequest(config, SYNC_WORKER_ACK_TIMEOUT_MS);
  if (result !== null) {
    return result;
  }

  // Ack timed out — worker likely dead from idle timeout race. Terminate and retry.
  syncWorker?.terminate();
  syncWorker = null;

  const retryResult = trySendSyncWorkerRequest(config, SYNC_WORKER_TIMEOUT_MS);
  if (retryResult !== null) {
    return retryResult;
  }

  throw new Error("Sync XHR worker timed out");
}

function trySendSyncWorkerRequest(config, ackTimeout) {
  const sharedBuffer = new SharedArrayBuffer(8);
  const int32 = new Int32Array(sharedBuffer);
  const { port1, port2 } = new MessageChannel();

  getSyncWorker().postMessage({ sharedBuffer, responsePort: port2, config }, [port2]);

  // Phase 1: wait for the worker to acknowledge receipt.
  const ackResult = Atomics.wait(int32, 0, 0, ackTimeout);
  if (ackResult === "timed-out") {
    return null;
  }

  // Phase 2: wait for the actual response.
  const waitResult = Atomics.wait(int32, 1, 0, SYNC_WORKER_TIMEOUT_MS);
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
