# FilterBridge — Next.js App Router example

A running Next.js 15 application that exercises the server/client boundary `@filterbridge/next`
exists for. It is the executable version of
[`docs/guides/next-app-router.md`](../../docs/guides/next-app-router.md); the guide's snippets are
copied out of these files, so the two cannot drift.

---

## Running it

This directory is **not** part of the pnpm workspace. It installs on its own and does not affect the
root `pnpm install` or CI.

```bash
cd examples/next-app-router
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Verified against

| Package                 | Version   |
| ----------------------- | --------- |
| `next`                  | `15.5.23` |
| `react` / `react-dom`   | `19.2.8`  |
| `@filterbridge/core`    | `0.4.0`   |
| `@filterbridge/next`    | `0.4.0`   |
| `@filterbridge/react`   | `0.4.0`   |
| `@filterbridge/browser` | `0.4.0`   |

The FilterBridge dependencies are pinned to published npm versions rather than `workspace:*`, so
this example works from a plain clone with no local build. The consequence, accepted deliberately:
CI does not build it, so it can rot.

`pnpm verify:next-example`, from the repository root, drives this app in real Chromium and checks
everything below — server parse, URL writes, preserved params, back/forward, and a clean console.
Start it with `npm run dev` first; the script refuses to run against a production build, because
React strips the render-phase warning there and the run would pass regardless.

To check unreleased packages, `pnpm pack:all` at the root and install the tarballs here by
`file:` reference, then restore this `package.json` before committing.

Next.js **15+ specifically**, because that is where `searchParams` became a Promise and
`parseNextSearchParamsAsync` is the function that matters.

---

## What it demonstrates

Four files, each carrying one part of the boundary.

| File                                                 | Role                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| [`app/filters.ts`](app/filters.ts)                   | One schema, imported by both sides — the reason they cannot drift          |
| [`app/page.tsx`](app/page.tsx)                       | Server component: `parseNextSearchParamsAsync` → `toQueryDto` → fetch      |
| [`app/invoices-client.tsx`](app/invoices-client.tsx) | Client component: `useFilterBridge`, `createNextFilterHref`, `router.push` |
| [`app/data.ts`](app/data.ts)                         | A fixture standing in for the API, filtered by the DTO                     |

### 1. The URL omits a default; the DTO carries it

`status` declares `{ default: 'pending' }`. Load the app at `/` with no query string at all and the
panel at the bottom shows:

```json
{
  "url": "/",
  "dtoTheServerUsed": { "status": "pending" },
  "clientState": { "status": "pending" }
}
```

The URL stays clean and the backend still receives the filter. That asymmetry is deliberate and is
the subject of [ADR-002](../../docs/decisions/002-default-values.md): omitting a default from the
URL is compression with a guaranteed decompressor, because `parseFilters` puts it back. Omitting it
from the DTO would be loss — the backend does not know the schema and would return everything.

The server side is where this is easiest to get wrong, which is why the example puts both outputs on
screen next to each other.

### 2. Back and forward

Change a filter, change it again, then press Back. The URL, the table, the filter controls and the
hook state all move together.

Two things make that work, and the guide was wrong about both before this example was written:

**`router.push`, not `router.replace`.** `replace` overwrites the current history entry, so a page
that only ever replaces has exactly one entry and Back leaves the application entirely. The cost of
`push` is one entry per change — a real app debounces the text input, or uses `replace` for text and
`push` for the discrete controls.

**`usePopstateSync` from `@filterbridge/browser/react`.** Back and forward do re-run the server
component and do produce a fresh `initialFilters`, but that alone changes nothing:
`useFilterBridge` is uncontrolled by design and captures `initialState` on the first render only, so
that a parent re-render cannot stomp on what the user is typing. React reconciles the client
component rather than remounting it. Without the sync, the URL and the table follow while the filter
inputs stay put.

`usePopstateSync` fires on popstate and nothing else, and is paired with `syncState`, which applies
state _without_ firing `onChange` — otherwise adopting the URL would immediately write the URL
again and fight the history stack.

### 3. Non-filter params survive

Load
[`/?status=paid&tab=open`](http://localhost:3000/?status=paid&tab=open) and change a filter. `tab`
is still there. `createNextFilterHref` preserves anything outside the schema and strips only the
filter params it owns.

---

## A rough edge this example closed

This example is how the defect below was found, which is why it is recorded here rather than
quietly deleted.

Until `0.3.1`, `onChange` fired from inside `useFilterBridge`'s `setState` updater, and React runs
updaters during the render phase — so calling `router.push` directly from `onChange` logged:

```txt
Cannot update a component (Router) while rendering a different component (InvoicesClient)
```

The example carried a `queueMicrotask` wrapper to move the navigation out of render. `0.4.0` fixed
the hook ([ADR-006](../../docs/decisions/006-onchange-timing.md)), so the wrapper is gone and
`router.push(href)` is simply what the code says.

It never affected `apps/demo`, which writes to `window.history` rather than to React state, so
nothing there was a React update — the impurity was identical and only the symptom was missing.

---

## What this is not

A second demo. There is no styling beyond the minimum, no table library, no pagination.
[`apps/demo`](../../apps/demo) is the app with a design; this one exists to make the
server/client boundary executable.
