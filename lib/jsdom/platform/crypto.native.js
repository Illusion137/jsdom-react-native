"use strict";

// See ./README.md. React Native variant: build on the global Web Crypto `getRandomValues`, which is
// available once the app installs a polyfill such as `react-native-get-random-values`.
function getWebCrypto() {
  const webCrypto = globalThis.crypto;
  if (!webCrypto || typeof webCrypto.getRandomValues !== "function") {
    throw new Error(
      "jsdom requires a Web Crypto implementation. In React Native, import " +
      "'react-native-get-random-values' at the top of your entry file to polyfill crypto.getRandomValues()."
    );
  }
  return webCrypto;
}

exports.randomFillSync = array => {
  // getRandomValues has a 65536-byte cap; Crypto-impl.js already enforces this limit before calling us.
  getWebCrypto().getRandomValues(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
  return array;
};

exports.randomUUID = () => {
  const webCrypto = getWebCrypto();
  if (typeof webCrypto.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  // RFC 4122 version 4 UUID derived from getRandomValues.
  const bytes = new Uint8Array(16);
  webCrypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;

  const hex = [];
  for (let i = 0; i < 256; i++) {
    hex.push((i + 0x100).toString(16).slice(1));
  }
  return (
    hex[bytes[0]] + hex[bytes[1]] + hex[bytes[2]] + hex[bytes[3]] + "-" +
    hex[bytes[4]] + hex[bytes[5]] + "-" +
    hex[bytes[6]] + hex[bytes[7]] + "-" +
    hex[bytes[8]] + hex[bytes[9]] + "-" +
    hex[bytes[10]] + hex[bytes[11]] + hex[bytes[12]] + hex[bytes[13]] + hex[bytes[14]] + hex[bytes[15]]
  );
};
