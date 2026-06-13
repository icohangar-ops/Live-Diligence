// Vendored from cubiczan-resilience (typescript/src). No npm registry available,
// so the needed primitives are copied here verbatim. Keep imports in-tree.
export { safeFetch } from "./safeFetch.js";
export type { SafeFetchOptions, AllowlistHook } from "./safeFetch.js";
export { retry, computeBackoff } from "./retry.js";
export type { RetryOptions } from "./retry.js";
export { ResilienceError, isResilienceError } from "./errors.js";
export type { ResilienceErrorKind, ResilienceErrorOptions } from "./errors.js";
