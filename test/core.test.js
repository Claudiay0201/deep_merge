import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merge, defaultOptions } from '../src/index.js';

// ---- defaults -------------------------------------------------------------

test('defaultOptions exposes the documented defaults', () => {
  assert.equal(defaultOptions.arrayStrategy, 'replace');
  assert.equal(defaultOptions.nullStrategy, 'delete');
});

// ---- happy path -----------------------------------------------------------

test('two plain objects merge recursively', () => {
  const out = merge({ a: { x: 1 }, b: 2 }, { a: { y: 2 }, c: 3 });
  assert.deepEqual(out, { a: { x: 1, y: 2 }, b: 2, c: 3 });
});

test('source overrides target at a leaf', () => {
  assert.deepEqual(merge({ a: 1, b: 2 }, { b: 9 }), { a: 1, b: 9 });
});

test('target is not mutated', () => {
  const target = { a: { x: 1 } };
  const source = { a: { y: 2 } };
  merge(target, source);
  assert.deepEqual(target, { a: { x: 1 } });
});

test('source is not mutated', () => {
  const target = { a: { x: 1 } };
  const source = { a: { y: 2 } };
  merge(target, source);
  assert.deepEqual(source, { a: { y: 2 } });
});

// ---- null handling --------------------------------------------------------

test('null in source deletes the key by default', () => {
  assert.deepEqual(merge({ a: 1, b: 2 }, { a: null }), { b: 2 });
});

test('null in source deletes a nested key by default', () => {
  assert.deepEqual(
    merge({ a: { x: 1, y: 2 } }, { a: { x: null } }),
    { a: { y: 2 } },
  );
});

test('null with nullStrategy keep writes null', () => {
  assert.deepEqual(
    merge({ a: 1 }, { a: null }, { nullStrategy: 'keep' }),
    { a: null },
  );
});

test('null deletes even when the target key was absent', () => {
  // Ensures the DELETE sentinel never leaks into the output as a property.
  assert.deepEqual(merge({ b: 1 }, { a: null }), { b: 1 });
});

// ---- array handling -------------------------------------------------------

test('arrays replace by default', () => {
  assert.deepEqual(merge({ a: [1, 2] }, { a: [3] }), { a: [3] });
});

test('arrayStrategy concat concatenates', () => {
  assert.deepEqual(
    merge({ a: [1, 2] }, { a: [3] }, { arrayStrategy: 'concat' }),
    { a: [1, 2, 3] },
  );
});

test('concat does not deduplicate', () => {
  assert.deepEqual(
    merge({ a: [1, 1] }, { a: [1] }, { arrayStrategy: 'concat' }),
    { a: [1, 1, 1] },
  );
});

test('concat falls back to replace when target is not an array', () => {
  assert.deepEqual(
    merge({ a: 'x' }, { a: [1] }, { arrayStrategy: 'concat' }),
    { a: [1] },
  );
});

test('merged array is a copy, not the source array', () => {
  const src = { a: [1, 2] };
  const out = merge({ a: [0] }, src);
  assert.notEqual(out.a, src.a);
});

// ---- non-plain objects ----------------------------------------------------

test('class instances are replaced, not merged into', () => {
  class Box { constructor(v) { this.v = v; } }
  const target = { a: new Box(1) };
  const source = { a: { v: 2 } };
  // Source is a plain object, target.a is not — source wins outright.
  assert.deepEqual(merge(target, source), { a: { v: 2 } });
});

test('Date instances are replaced, not recursively merged', () => {
  const d = new Date(0);
  const out = merge({ a: d }, { a: { x: 1 } });
  assert.deepEqual(out, { a: { x: 1 } });
});

test('Object.create(null) is treated as a plain object', () => {
  const target = Object.create(null);
  target.x = 1;
  const source = Object.create(null);
  source.y = 2;
  const out = merge(target, source);
  assert.equal(out.x, 1);
  assert.equal(out.y, 2);
});

// ---- option validation ----------------------------------------------------

test('invalid arrayStrategy throws', () => {
  assert.throws(() => merge({}, {}, { arrayStrategy: 'magic' }), TypeError);
});

test('invalid nullStrategy throws', () => {
  assert.throws(() => merge({}, {}, { nullStrategy: 'magic' }), TypeError);
});

// ---- top-level non-objects ------------------------------------------------

test('merging a plain object over a primitive yields the object', () => {
  assert.deepEqual(merge(5, { a: 1 }), { a: 1 });
});

test('merging a primitive over a primitive replaces', () => {
  assert.equal(merge(5, 9), 9);
});

test('merging null over a primitive deletes (returns the DELETE sentinel at top level)', () => {
  // At the top level there is no key to remove, so the DELETE sentinel is
  // returned as-is by the recursive worker. This documents current behavior;
  // callers who need a defined value should use nullStrategy: 'keep'.
  assert.equal(typeof merge(5, null), 'symbol');
});

test('merging null over a primitive with nullStrategy keep returns null', () => {
  assert.equal(merge(5, null, { nullStrategy: 'keep' }), null);
});
