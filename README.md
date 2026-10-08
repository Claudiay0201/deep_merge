# deep-merge

Deep-merges plain objects. Arrays and null follow explicit, configurable rules so you never have to guess what happens at a leaf.

```js
import { merge } from 'deep-merge';

const config = merge(
  { host: 'localhost', retries: 3, tags: ['a'] },
  { retries: 5, tags: ['b'], timeout: null }
);
// { host: 'localhost', retries: 5, tags: ['b'] }
```

## Why

Config composition. You have a base config and a per-environment override; you want the override to fill gaps and replace leaves without clobbering whole subtrees by accident. A shallow spread loses nested keys; a naive deep merge surprises you on arrays and null. This library picks one rule for each and sticks to it.

## Rules

- **Plain objects** (`{}`, `Object.create(null)`) merge recursively. Class instances (`Date`, `RegExp`, `Map`, your own classes) are treated as opaque values and replaced wholesale — merging into a `Date` is a bug factory, so we don't.
- **Arrays** replace by default. Set `arrayStrategy: 'concat'` to concatenate target then source (no deduplication). Element-wise array merging is deliberately not supported; every caller wants something different.
- **null** in the source deletes the key by default. Set `nullStrategy: 'keep'` to write null as an ordinary value.

## Options

```js
merge(target, source, {
  arrayStrategy: 'replace' | 'concat', // default 'replace'
  nullStrategy: 'delete' | 'keep',     // default 'delete'
});
```

## Edge you will hit

At the top level, merging `null` with the default `delete` strategy returns `undefined` — there is no key to remove, so "nothing" is the honest result. If you need a defined value, use `nullStrategy: 'keep'` or guard the call.

The target and source are not mutated. Merged arrays are copies. Class instances are passed through by reference, not cloned.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

