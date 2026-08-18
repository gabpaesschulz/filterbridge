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
| `@filterbridge/core`    | `0.2.0`   |
| `@filterbridge/next`    | `0.2.0`   |
| `@filterbridge/react`   | `0.2.0`   |
| `@filterbridge/browser` | `0.2.0`   |

The FilterBridge dependencies are pinned to published npm versions rather than `workspace:*`, so
this example works from a plain clone with no local build. The consequence, accepted deliberately:
CI does not build it, so it can rot. If you change the packages, re-run it by hand.

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

## Known rough edge

`onChange` fires from inside `useFilterBridge`'s `setState` updater, and React runs updaters during
the render phase — so calling `router.push` directly from `onChange` logs:

```txt
Cannot update a component (Router) while rendering a different component (InvoicesClient)
```

The example wraps the navigation in `queueMicrotask` to move it out of render. That is a workaround
for a library defect, not a pattern worth copying on its own; it is written up in
[Sprint 1 task 6](../../docs/sprints/sprint-1/06-onchange-fires-during-render.md). When the hook
fires `onChange` outside render, the wrapper can go.

It does not affect `apps/demo`, which writes to `window.history` rather than to React state, so
nothing there is a React update.

---

## What this is not

A second demo. There is no styling beyond the minimum, no table library, no pagination.
[`apps/demo`](../../apps/demo) is the app with a design; this one exists to make the
server/client boundary executable.
