// Small stand-ins for built-in functions that older iPhones lack (iOS before 15.4, e.g. some
// iPhone 7/8 users). Loaded before the app becomes interactive. Modern browsers skip all of this.
/* eslint-disable @typescript-eslint/no-explicit-any */

function at(this: any, n: number) {
  n = Math.trunc(n) || 0;
  if (n < 0) n += this.length;
  return n < 0 || n >= this.length ? undefined : this[n];
}
for (const C of [Array, String, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array] as any[]) {
  if (C?.prototype && !C.prototype.at) Object.defineProperty(C.prototype, "at", { value: at, writable: true, configurable: true });
}

if (!(Object as any).hasOwn) {
  Object.defineProperty(Object, "hasOwn", { value: (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k), writable: true, configurable: true });
}

if (!(Array.prototype as any).findLast) {
  Object.defineProperty(Array.prototype, "findLast", {
    value(this: any[], fn: (v: unknown, i: number, a: unknown[]) => boolean) {
      for (let i = this.length - 1; i >= 0; i--) if (fn(this[i], i, this)) return this[i];
      return undefined;
    },
    writable: true,
    configurable: true,
  });
}

export {};
