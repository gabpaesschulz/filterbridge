# Task 10 — Regression tests and `0.2.0` release

**Priority:** P2 — closes the sprint
**Area:** all packages, docs
**Status:** done — retargeted to `0.2.0`; everything but the publish itself is complete

---

## Problem

### The suite is green and the library is not

299 tests pass across 17 files. Not one of them catches any of the four P0 defects in this sprint.
That is the finding that matters most here: the tests are extensive but example-based, checking
inputs the implementation was written to handle. The bugs live in the inputs nobody thought to
enumerate — repeated params, `NaN`, out-of-schema values, whitespace.

Adding four targeted tests would close these four holes and leave the next four open. The suite
needs a different *kind* of test, not more of the same kind.

### Stale documentation

- [`examples/basic/README.md:5`](../../../examples/basic/README.md) states *"No demo app is included
  yet — that comes in a future wave."* The demo shipped in Wave 4 and has been deployed publicly
  since. CLAUDE.md §13 requires "no placeholder documentation".
- [`docs/releases/v0.1.0.md:81-89`](../../releases/v0.1.0.md) lists limitations that this sprint
  removes.

## Proposed work

### 1. Property-based round-trip tests

The single highest-value addition. One property covers all four P0 bugs and the ones not yet found:

```
for arbitrary state S:
  parseFilters(schema, toSearchParams(schema, S)) === cleanState(S)
```

Plus DTO idempotence:

```
toQueryDto(schema, parseFilters(schema, params)) === toQueryDto(schema, state)
```

A generator producing values *outside* the schema is the part that matters — invalid options,
non-finite numbers, whitespace strings, empty range sides. Every P0 defect in this sprint fails
this property today.

`fast-check` is the obvious tool, but CLAUDE.md §11 says to avoid unnecessary dependencies. It
would be a `devDependency` only, never shipped, and it is the standard choice for exactly this.
If that is still judged too heavy, a hand-written table of ~30 adversarial inputs run through the
same assertion captures most of the value — decide before starting.

### 2. Cross-package consistency test

Assert `parseFilters` and `parseNextSearchParams` agree on identical URLs. This is what would have
caught [task 1](./01-repeated-query-params.md), where two packages in the same repo disagreed about
the same input without anything failing.

### 3. Targeted regression tests

One named test per P0 defect, using the exact reproduction from each task file, so a future
regression names the bug it reintroduced instead of failing an opaque property.

### 4. Documentation cleanup

- Rewrite [`examples/basic/README.md`](../../../examples/basic/README.md) — point at the real demo
- Update "Known limitations" in [`docs/releases/v0.1.0.md`](../../releases/v0.1.0.md) for what this
  sprint fixed
- Check off completed items in [`docs/roadmap.md`](../../roadmap.md)
- Update the test count wherever it is quoted

### 5. Release

Per [`docs/release-checklist.md`](../../release-checklist.md):

- Changeset for `0.1.1` (all five packages are in the `fixed` group, so they version together)
- **Behavior changes stated plainly**, not filed as generic bug fixes. Tasks 3 and 4 narrow what
  serialization accepts — invalid `select` values and whitespace text that used to reach the URL no
  longer do. That output was already broken end-to-end, which is why `0.1.1` is defensible rather
  than `0.2.0`, but a reader of the CHANGELOG must be able to see it without reading the diff.
- `pnpm pack:all` and re-run the `.smoke/` ESM + CJS assertions
- CI green ([task 9](./09-ci-workflow.md)) before publishing

## Acceptance criteria

- [x] Round-trip property test exists and covers out-of-schema inputs
- [x] Every P0 fix in this sprint has a named regression test
- [x] Cross-package consistency test between `core` and `next`
- [x] Reverting any single P0 fix turns the suite red — verified by actually reverting one, not
      assumed
- [x] No stale claims remain in `examples/`, release notes, or roadmap
- [x] Changeset written, behavior changes called out explicitly
- [x] `.smoke/` ESM and CJS assertions pass against freshly packed tarballs
- [ ] CI green on Linux — the workflow exists ([task 9](./09-ci-workflow.md)) but has never run;
      nothing in this sprint is committed or pushed yet

## Outcome

**Generator, not `fast-check`.** The hand-written adversarial generator landed alongside the P0
fixes and was extended here rather than replaced: a seeded LCG plus value pools, ~40 lines, zero
dependencies. The dependency question stays closed until a property needs shrinking.

**Two defects found by the new properties, neither known when this task was written:**

1. `parseFloat('Infinity')` is `Infinity`, and `parseFilters` guarded with `!isNaN` — so
   `amountMin=Infinity` entered state and the serializers dropped it again. [Task 2](./02-non-finite-numbers.md)
   fixed the way out and not the way in.
2. `toQueryDto` never type-checked `boolean`, so `{ active: 'true' }` was dropped from the URL and
   kept in the DTO as a string — the same asymmetry [task 3](./03-serialization-validation.md)
   closed for `select`.

Both are fixed, both have named regression tests, and both were caught by the DTO-parity property
(`toQueryDto(state)` must equal `toQueryDto(parse(serialize(state)))`), not by reading the code.

**What is asserted now.** Two directions (state → URL → state, and URL → state → URL), 500
generated cases each, against a schema with defaults and one without; `toQueryDto` agreement with
the URL; every DTO surviving `JSON.stringify` unchanged; no key outside the schema ever emitted;
and 300 generated URLs where `parseFilters` and `parseNextSearchParams` must agree in both input
shapes Next.js can produce.

**Suite:** 299 → 507 tests, 17 → 28 files. Each of the six fixes was reverted individually and the
suite confirmed red every time.

**Also found:** re-running `npm install` in `.smoke/` over a rebuilt tarball of the *same* version
silently reinstalls the cached old code — the smoke test was passing against `0.1.0` artifacts. The
checklist now says to wipe `node_modules` and `package-lock.json` first.

## Risk

Low. Tests and documentation only. The one judgment call is the `0.1.1` vs `0.2.0` version choice —
`0.1.1` is defensible because the changed outputs were already broken, but if tasks 5–7 land in the
same release, their API additions make `0.2.0` the more honest number.

## Related

Every other task in [Sprint 0](./README.md).
