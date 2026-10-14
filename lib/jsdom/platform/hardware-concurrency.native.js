"use strict";

// See ./README.md. React Native variant: there is no portable CPU-count API, so report a
// conservative, plausible value. (Browsers also commonly clamp/obscure this figure.)
exports.getHardwareConcurrency = () => 4;
