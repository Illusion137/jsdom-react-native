"use strict";

// See ./README.md. React Native variant: a small best-effort stand-in for util.inspect, which jsdom
// uses only to render values into human-readable console/error output.
function inspect(value) {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }
  if (typeof value === "function") {
    return `[Function: ${value.name || "anonymous"}]`;
  }
  if (typeof value === "bigint") {
    return `${value}n`;
  }
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (typeof value !== "object" || value === null) {
    return String(value);
  }

  try {
    return JSON.stringify(value, (key, val) => {
      if (typeof val === "bigint") {
        return `${val}n`;
      }
      if (typeof val === "function") {
        return `[Function: ${val.name || "anonymous"}]`;
      }
      return val;
    }, 2) ?? String(value);
  } catch {
    // Circular references and other non-serializable values fall back to a plain string.
    return Object.prototype.toString.call(value);
  }
}

exports.inspect = inspect;
