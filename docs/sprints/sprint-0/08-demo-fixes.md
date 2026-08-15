# Task 8 — Three defects in the demo app

**Priority:** P2 — but all three are visible on the deployed demo
**Area:** `apps/demo`
**Status:** done — 8b implemented as a three-option `<select>`; 8c implemented with `useId` +
`role="group"`, verified by an axe-core suite that now runs as part of `pnpm test`

> ⚠️ **Historical record.** See [the sprint README](./README.md#-historical-record).Accurate as written.

---

The demo is the project's showcase — it is linked from the README and deployed publicly. These are
three independent defects, small enough to share one task.

---

## 8a — Broken GitHub link in the footer

The footer links to `https://github.com/gabrigomez/filterbridge`
([`apps/demo/src/App.tsx:136`](../../../apps/demo/src/App.tsx)), but the repository is
`gabpaesschulz/filterbridge` — confirmed by `git remote -v` and by the `repository`, `bugs`, and
`homepage` fields in all five published `package.json` files.

The single "go to the source" link on the demo is dead.

**Fix:** correct the URL. Then grep the whole repo for other occurrences of the wrong owner — the
package manifests and docs are consistent, but the demo proves the string leaked somewhere, so it
may have leaked more than once.

**Acceptance:**

- [x] Footer resolves to the real repository
- [x] No occurrence of `gabrigomez` remains anywhere in the repo — the demo footer was the only one

The footer link was also the one `link-in-text-block` violation axe reported: it sits inside a run
of text and was distinguished by colour alone. It is now underlined.

---

## 8b — The `boolean` filter cannot be cleared

The Archived control is a plain checkbox
([`apps/demo/src/components/FilterCard.tsx:110-119`](../../../apps/demo/src/components/FilterCard.tsx)):

```tsx
checked={state.archived ?? false}
onChange={(e) => set('archived', e.target.checked)}
```

A `boolean()` filter has three states — `true`, `false`, and `undefined` (not filtering) — but a
checkbox has two. Once touched, the filter can never return to `undefined`: unchecking writes
`archived: false`, which is a real filter value, so `archived=false` is pinned to the URL for the
rest of the session. Every other filter in the demo has a clear affordance; this one does not. The
"Fill example" button makes it worse by seeding `archived: false`
([`apps/demo/src/filters.ts:26`](../../../apps/demo/src/filters.ts)).

It also misrepresents the library in the one place people evaluate it: `undefined` renders
identically to `false`, so the demo appears to show a two-state boolean.

**Fix options:** a three-option `<select>` (Any / Yes / No), or keep the checkbox and add the same
`clear-btn` the other fields use. The select is more honest about the three states; the clear
button is a smaller diff and matches the existing visual language.

**Resolution:** the three-option `<select>` — "Any — not filtering" / "Yes — archived only" /
"No — active only" — with the same `clear-btn` the other fields use. The select makes the third
state visible rather than implied, which is the point of showing it on the demo at all.

`exampleState` still seeds `archived: false`; with a tri-state control that is now an honest
demonstration that `false` is a real filter value, not an accident.

**Acceptance:**

- [x] The boolean filter can return to `undefined` through the UI
- [x] `archived` disappears from the URL when unset
- [x] `undefined` is visually distinct from `false`
- [x] `activeFilterCount` does not count an unset boolean

---

## 8c — Form labels are not associated with their inputs

`FieldGroup` renders the label as a _sibling_ of the control, with no `htmlFor` and without
wrapping it ([`apps/demo/src/components/FieldGroup.tsx:8-13`](../../../apps/demo/src/components/FieldGroup.tsx)):

```tsx
<label className="field-label">{label}{hint && <span>{hint}</span>}</label>
<div className="field-control">{children}</div>
```

Nothing connects the two. Every field routed through `FieldGroup` — Search, Status, Tags, Issued At,
Amount — has no accessible name. A screen reader announces "edit text, blank"; clicking the label
does not focus the input.

The inner controls do not compensate: no `id`, no `aria-label`, no `aria-labelledby`
([`FilterCard.tsx`](../../../apps/demo/src/components/FilterCard.tsx)). The Tags checkboxes and the
Archived toggle are the exceptions — they use wrapping `<label>` elements and are correctly
associated.

The range fields have a second layer of the same problem: "From"/"To" and "Min"/"Max" are `<span>`
elements ([`FilterCard.tsx:124`, `:135`](../../../apps/demo/src/components/FilterCard.tsx)), so the
two date inputs are indistinguishable to assistive technology.

**Fix:** give `FieldGroup` a generated `id` (`useId`) and pass it down, or render the label as a
wrapper. The range sub-labels need the same treatment. `aria-label` on each input is the smallest
possible change but leaves the visible text still unassociated — prefer real association.

**Resolution:** `FieldGroup` generates an id with `useId` and hands it to a render-prop child, so
the single-control fields get a real `<label htmlFor>`. Fields holding more than one control (Tags,
Issued At, Amount) render as `role="group"` + `aria-labelledby` instead, and each inner control
carries its own label; the range sub-labels are `<label htmlFor>` with a visually-hidden field-name
prefix, giving "Issued at From" / "Amount Min".

The builder-name chip (`multiSelect`, `boolean`) moved out of the `<label>` into a sibling — inside
it, it was leaking into the accessible name ("Archived boolean").

`<fieldset>`/`<legend>` was the first attempt and works, but a legend cannot hold a sibling for the
chip, so the ARIA group won.

**Acceptance:**

- [x] Every input has an accessible name
- [x] Clicking a field label focuses its control — verified in Chromium
- [x] Range inputs are distinguishable ("Issued at From" / "Issued at To")
- [x] Verified with an accessibility checker, not by inspection

**How it is verified:** [`apps/demo/src/__tests__/a11y.test.tsx`](../../../apps/demo/src/__tests__/a11y.test.tsx)
runs axe-core over the rendered `<App />`, empty and with every filter set, and asserts each
control's accessible name through role queries. `apps/demo` is now a `pnpm test` project, so this
runs in the normal suite. The same audit was re-run in real Chromium via Playwright, which also
covers the layout-dependent rules jsdom cannot evaluate.

---

## Risk

None to the published packages — `apps/demo` is not published. 8b was worth a second look at the
library itself: `clear(key)` _is_ the intended way to express "not filtering", and
[`docs/api/react.md`](../../api/react.md) now says so under `clear()`, with the three-state boolean
table and the tri-state control pattern.

## Found while verifying, not fixed

The Chromium audit reports 25 `color-contrast` violations, all pre-existing and none related to
labels:

- `--color-muted` (`#6b7280`) on `--color-bg` (`#f4f5f7`) is **4.43:1** — just under the 4.5:1 AA
  threshold. This is the bulk of them: column titles, hints, table headers, the active-filter count.
- The status pills use white text on `#16a34a` / `#d97706` / `#9ca3af` — **3.29:1**, **3.18:1**,
  **2.53:1**.
- The green URL-sync badge and `.url-path` are ~**3:1**.

Fixing these means changing the palette, which is a visual decision outside this task. Tracked
separately. The committed jsdom suite disables the `color-contrast` rule — jsdom has no layout or
canvas and cannot measure it — so re-running the Playwright audit is the way to check this.

## Related

- [Task 5 — external state sync](./05-external-state-sync.md) — also verified in the demo
- [Task 2](./02-non-finite-numbers.md), [Task 4](./04-empty-value-normalization.md) — the demo's
  input handlers produce the shapes those tasks fix
