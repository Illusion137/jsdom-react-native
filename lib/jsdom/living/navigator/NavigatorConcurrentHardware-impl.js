"use strict";
const { getHardwareConcurrency } = require("../../platform/hardware-concurrency");

exports.implementation = class NavigatorConcurrentHardwareImpl {
  get hardwareConcurrency() {
    return getHardwareConcurrency();
  }
};
