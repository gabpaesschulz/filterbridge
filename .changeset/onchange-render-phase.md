---
'@filterbridge/react': minor
---

`useFilterBridge` no longer calls `onChange` during the render phase.

It used to fire from inside the `setState` updater, which React runs while
rendering and requires to be pure. The next state is now computed in the event
handler and `onChange` is called there, immediately after the update is queued.

**Two behaviour changes you can see:**

- An `onChange` that updates React state — `router.push` / `router.replace`, which
  the Next.js guide recommends — no longer produces
  `Cannot update a component while rendering a different component`. The
  `queueMicrotask` workaround documented for `0.3.1` is no longer needed and has
  been removed from the guide and the example.
- Under `<React.StrictMode>` in development, `onChange` fired **twice** per state
  change. It now fires once.

Everything else is unchanged: `onChange` still fires synchronously as part of the
action with the same argument, `syncState` still does not fire it, and two
mutators in one handler still compose. See
[ADR-006](https://github.com/gabpaesschulz/filterbridge/blob/main/docs/decisions/006-onchange-timing.md).
