# Task 3 — The demo's 25 colour-contrast violations

**Priority:** P2 — the demo is the first thing anyone sees
**Area:** `apps/demo`
**Status:** done

---

## Outcome

Zero `color-contrast` violations in real Chromium, on the initial render and after "Fill example".

Decisions taken as recommended: option A (minimum viable darkening), dark-text-on-tint for the
pills, a `pnpm demo:a11y` script run by hand and left out of CI, and no change to the jsdom suite.

| Value            | Was                | Now                    | Ratio                             |
| ---------------- | ------------------ | ---------------------- | --------------------------------- |
| `--color-muted`  | `#6b7280`          | `#5b6270`              | 4.43 → 5.62 on `--color-bg`       |
| `--color-green`  | `#16a34a`          | `#166534`              | 3.00 → 6.49 on `--color-green-bg` |
| `paid` pill      | white on `#16a34a` | `#166534` on `#dcfce7` | 3.30 → 6.49                       |
| `pending` pill   | white on `#d97706` | `#92400e` on `#fef3c7` | 3.19 → 6.37                       |
| `cancelled` pill | white on `#9ca3af` | `#4b5563` on `#e5e7eb` | 2.54 → 6.10                       |
| `draft` pill     | white on `#6b7280` | `#374151` on `#f3f4f6` | 4.83 → 9.37                       |
| `failed` pill    | white on `#dc2626` | `#991b1b` on `#fee2e2` | 4.83 → 6.80                       |

Two things the task did not list turned up while measuring and were fixed in the same pass: the
`.clear-btn:hover` red on its `#fef2f2` tint was **4.41:1** (now `--color-red-h` `#b91c1c`, 5.60:1),
and `--color-green` is used for `.url-path` on `--color-url-bg` as well as for the badge — one value,
two failing surfaces, both closed by the same change.

The pills moved from inline styles in `InvoiceTable.tsx` into `styles.css` classes, so the whole
palette is in one file with its measured ratio in a comment beside each value.

**The script was verified against a known-bad state, not only a good one.** Reverting
`--color-muted` to `#6b7280` and re-running reproduced 15 violations with the exact 4.43:1 figure —
so a clean run means the rule ran, not that it was skipped. That check is worth repeating whenever
an audit reports zero.

The verification method is written down in
[`apps/demo/README.md`](../../../apps/demo/README.md#accessibility) and in the "Writing tests"
section of [`CONTRIBUTING.md`](../../../CONTRIBUTING.md), not only here.

---

## Problem

An axe-core audit in real Chromium during Sprint 0 found 25 colour-contrast violations in the demo.
All of them predate that sprint and none were introduced by its label fixes. They were recorded in
[the roadmap](../../roadmap.md#the-demo-has-25-colour-contrast-violations) and deferred because
fixing them means changing the palette, which is a visual decision rather than a correctness one.

Measured, with the offending values still in place:

| Pair                                                | Ratio      | Where                                                        | Source                                                                      |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `--color-muted` `#6b7280` on `--color-bg` `#f4f5f7` | **4.43:1** | column titles, hints, table headers, the active filter count | [`styles.css:9`](../../../apps/demo/src/styles.css)                         |
| white on `#16a34a`                                  | **3.29:1** | `paid` status pill                                           | [`InvoiceTable.tsx:55`](../../../apps/demo/src/components/InvoiceTable.tsx) |
| white on `#d97706`                                  | **3.18:1** | `pending` status pill                                        | [`InvoiceTable.tsx:54`](../../../apps/demo/src/components/InvoiceTable.tsx) |
| white on `#9ca3af`                                  | **2.53:1** | `cancelled` status pill                                      | [`InvoiceTable.tsx:57`](../../../apps/demo/src/components/InvoiceTable.tsx) |
| green URL-sync badge, `.url-path`                   | ~**3:1**   | URL sync indicator                                           | [`styles.css:92`](../../../apps/demo/src/styles.css)                        |

The AA threshold is 4.5:1 for normal text. `--color-muted` misses it by 0.07 — close enough that it
was plainly never measured, which is the actual finding.

## Why it is worth doing now

[`docs/concepts/why-filterbridge.md`](../../concepts/why-filterbridge.md) sells the library to people
building administrative interfaces, and the demo is the artifact that argument rests on. A demo that
fails the most mechanical accessibility check there is undercuts it.

There is also a self-inflicted gap: the committed suite runs axe on every render
([`a11y.test.tsx`](../../../apps/demo/src/__tests__/a11y.test.tsx)) with `color-contrast` explicitly
disabled, because jsdom has no layout engine and cannot measure it. So the demo has an accessibility
test that structurally cannot catch this class of bug, and nothing else does.

## Decisions needed before implementing

### 1. How far does the palette move?

| Option                       | Trade-off                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — minimum viable darkening | Nudge `--color-muted` to roughly `#5b6270`, darken the three pill backgrounds until white text clears 4.5:1. Smallest diff, and the demo looks the same |
| B — deliberate palette pass  | Rebuild the neutral ramp and the status colours as a coherent set with stated contrast targets. Better result, much larger visual change to review      |

**Recommendation: A.** The demo's job is to demonstrate the library, and a palette redesign is
scope this sprint did not ask for. Do B only if A produces colours that visibly clash.

For the pills specifically, white-on-colour at these hues cannot reach 4.5:1 without going so dark
the pill stops reading as a status colour. The conventional fix — and the one the demo's own
`--color-green` / `--color-green-bg` pair already uses at
[`styles.css:12-13`](../../../apps/demo/src/styles.css) — is dark text on a light tint. Prefer that
over darkening the fills.

### 2. How is the fix verified?

jsdom cannot measure contrast, so the committed test will never prove this. Options:

- Run the audit manually in real Chromium and record the result in the task. Cheap, and it rots the
  moment someone edits the CSS.
- Add a Playwright-based audit script. `playwright` is already a root dev dependency and
  [`scripts/capture-demo-screenshot.mjs`](../../../scripts/capture-demo-screenshot.mjs) already
  launches Chromium against the running demo, so the harness exists — the script would inject
  `axe-core`, run it with `color-contrast` enabled, and exit non-zero on violations.

**Recommendation: the script**, as `pnpm demo:a11y`, run manually. Do **not** wire it into CI in
this sprint: it needs a browser download and a running dev server, which is a materially heavier CI
job than anything the workflow does today. Note it in the script's header comment as a candidate for
a later CI job, and leave the decision there.

### 3. Does the jsdom test change?

No. Leave `color-contrast` disabled there with its existing comment. Two audits with different
capabilities is the honest arrangement; enabling a rule that the environment cannot evaluate would
produce a silent pass, which is worse than an acknowledged gap.

## Acceptance criteria

- [x] Zero `color-contrast` violations in a real-Chromium axe run against the demo
- [x] The screenshot in [`docs/assets/`](../../assets/) is regenerated if the palette shifted
      visibly — a README screenshot that no longer matches the deployed demo is its own defect
- [x] The existing jsdom a11y suite still passes, unmodified
- [x] The roadmap's housekeeping entry is removed
- [x] Whatever verification method is chosen is written down where the next person will find it, not
      only in this file

## Risk

Low. Demo-only; nothing in `packages/` is touched, and the demo is never published. The changeset
for this task is empty.

The one thing to watch is the screenshot: [`docs/assets/README.md`](../../assets/README.md) and the
root README both point at it, and `pnpm screenshot` needs the demo running.

## Related

- [Sprint 0 task 8 — demo fixes](../sprint-0/08-demo-fixes.md) — added the axe suite and found these
- [Task 1 — formatting](./01-formatting-and-format-check.md) — do first; it rewrites `styles.css`
