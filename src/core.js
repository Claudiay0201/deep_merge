/**
 * Deep-merge implementation.
 *
 * The library merges plain objects ("mappings") recursively. Everything else
 * — arrays, primitives, null — is handled by explicit, configurable rules so
 * the caller never has to guess what happens at a leaf.
 *
 * Design decisions, stated plainly so the tests and README can rely on them:
 *
 * 1. Only plain objects are merged recursively. A "plain object" is an object
 *    whose prototype is Object.prototype or null. Instances of classes
 *    (Date, RegExp, Map, Error, …) are treated as opaque values and replaced
 *    wholesale by the rule for non-objects. This avoids the well-known trap
 *    of accidentally merging into a Date and producing { getTime: … }.
 *
 * 2. Arrays are NOT merged element-wise by default. The default rule is
 *    "replace": the target array is discarded and the source array wins.
 *    Element-wise array merging is a rabbit hole (concatenate? index-merge?
    *    dedupe?) and every caller wants something different, so the library
 *    refuses to pick. Callers who need concatenation can do it themselves
 *    before calling merge, or pass a custom arrayStrategy.
 *
 * 3. null is treated as an explicit "delete this key" signal when it appears
 *    in the source. That is the one ergonomic shortcut the library bakes in:
 *    { a: 1 } merged with { a: null } yields {}. If you need to keep null as
 *    a value, set nullStrategy: 'keep'.
 */

/**
 * @typedef {Object} MergeOptions
 * @property {'replace'|'concat'} [arrayStrategy='replace']
 *   How to combine arrays when both target and source at a key are arrays.
 *   'replace' (default): source array wins outright.
 *   'concat': target array followed by source array. No deduplication.
 * @property {'delete'|'keep'} [nullStrategy='delete']
 *   What to do when the source value at a key is null.
 *   'delete' (default): the key is removed from the result.
 *   'keep': null is written into the result as an ordinary value.
 */

/**
 * The options used when the caller does not provide any. Exported so callers
 * and tests can reference the exact defaults rather than re-stating them.
 */
export const defaultOptions = Object.freeze({
  arrayStrategy: 'replace',
  nullStrategy: 'delete',
});

/**
 * True for plain objects only: {} or Object.create(null). Class instances,
 * arrays, and every other object subtype return false. We check the prototype
 * chain directly rather than using duck-typing so that a Date or a RegExp is
 * never mistaken for a mergeable mapping.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Internal recursive worker. The public `merge` validates options once and
 * then delegates here, threading the resolved options through every level.
 *
 * @param {*} target
 * @param {*} source
 * @param {Required<MergeOptions>} opts
 * @returns {*}
 */
function mergeValue(target, source, opts) {
  // null in the source is the one special-cased primitive. We handle it
  // before the object check so that null never falls through to "replace".
  if (source === null) {
    if (opts.nullStrategy === 'keep') return null;
    // 'delete' semantics at the value level: returning the sentinel tells
    // the caller (mergeObject) to drop the key entirely.
    return DELETE;
  }

  // If the source is a plain object, we either recurse into the target (when
  // it is also a plain object) or start fresh. Starting fresh matters: merging
  // { a: { x: 1 } } over a number should give { a: { x: 1 } }, not throw.
  if (isPlainObject(source)) {
    const base = isPlainObject(target) ? target : {};
    return mergeObject(base, source, opts);
  }

  // Arrays follow the configured strategy. Only when BOTH sides are arrays do
  // we consider 'concat'; otherwise the source replaces, full stop.
  if (Array.isArray(source)) {
    if (opts.arrayStrategy === 'concat' && Array.isArray(target)) {
      return target.concat(source);
    }
    return source.slice();
  }

  // Any other source value (string, number, boolean, class instance, etc.)
  // replaces the target outright. We do not clone primitives, and we do not
  // attempt to clone class instances — callers should not expect merge to
  // defend against shared mutable references for non-plain values.
  return source;
}

/**
 * Merge two plain objects, producing a new object. The target is not mutated;
 * we shallow-copy it first so that keys absent from the source are preserved
 * by reference and only the merged keys are rebuilt.
 *
 * @param {Object} target
 * @param {Object} source
 * @param {Required<MergeOptions>} opts
 * @returns {Object}
 */
function mergeObject(target, source, opts) {
  const out = {};

  // Copy target keys first so source can override or delete them.
  for (const key of Object.keys(target)) {
    out[key] = target[key];
  }

  for (const key of Object.keys(source)) {
    const merged = mergeValue(target[key], source[key], opts);
    if (merged === DELETE) {
      // null with 'delete' strategy: remove the key if it survived from the
      // target, and never add it if it didn't.
      delete out[key];
    } else {
      out[key] = merged;
    }
  }

  return out;
}

// Sentinel returned by mergeValue to signal "remove this key". Using a
// unique object rather than undefined keeps it distinct from a legitimate
// undefined source value, which we treat as an ordinary replacement.
const DELETE = Symbol('deep-merge/delete');

/**
 * Deep-merge two values into a new value. See the module docstring for the
 * rules that govern arrays, null, and non-plain objects.
 *
 * @param {*} target
 * @param {*} source
 * @param {MergeOptions} [options]
 * @returns {*}
 */
export function merge(target, source, options = {}) {
  const opts = {
    arrayStrategy: options.arrayStrategy ?? defaultOptions.arrayStrategy,
    nullStrategy: options.nullStrategy ?? defaultOptions.nullStrategy,
  };

  if (opts.arrayStrategy !== 'replace' && opts.arrayStrategy !== 'concat') {
    throw new TypeError(`arrayStrategy must be 'replace' or 'concat', got ${JSON.stringify(opts.arrayStrategy)}`);
  }
  if (opts.nullStrategy !== 'delete' && opts.nullStrategy !== 'keep') {
    throw new TypeError(`nullStrategy must be 'delete' or 'keep', got ${JSON.stringify(opts.nullStrategy)}`);
  }

  return mergeValue(target, source, opts);
}
