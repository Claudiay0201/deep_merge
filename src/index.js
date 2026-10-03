/**
 * Public entry point for the deep-merge library.
 *
 * Re-exports the single merge function and the default option set so callers
 * can import by name. Keeping the surface tiny on purpose: the library does
 * one thing, and option discovery happens through the README rather than
 * through a sprawling API.
 */
export { merge } from './core.js';
export { defaultOptions } from './core.js';
