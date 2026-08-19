# `@filterbridge-internal/react-19`

A package with no source. It exists so that React 19, React DOM 19 and the Testing Library that
binds them live in **one dependency tree of their own**, which
[`vitest.react-19.ts`](../../vitest.react-19.ts) points the React 19 vitest projects at.

## Why not aliased dependencies

The obvious way to get a second React into the repository is a pnpm alias inside the packages that
need it:

```jsonc
// packages/react/package.json — tried, and reverted
"devDependencies": {
  "react-19": "npm:react@^19.0.0",
  "react-dom-19": "npm:react-dom@^19.0.0"
}
```

It installs, and it is wrong. `react-dom@19` declares `react@^19` as a peer, pnpm resolves that peer
from the surrounding package — which already depends on `react@^18.3.0` — and says so:

```txt
packages/react
└─┬ react-dom 19.2.8
  └── ✕ unmet peer react@^19.2.8: found 18.3.1
```

A vitest `resolve.alias` does not rescue it. Vitest externalises `node_modules` by default, so
`react-dom-19`'s own `require('react')` is resolved by Node against its own tree and never passes
through Vite. The suite would load React DOM 19 against React 18 and fail in a way that reads like a
library bug rather than a configuration one — the "two Reacts" failure mode.

Here there is exactly one `react` in scope, so pnpm resolves every peer to 19 and Node's own
resolution is correct from the first import. No inlining, no `server.deps` tuning, and nothing that
breaks quietly when a transitive dependency changes.

## How it is used

Nothing imports this package by name. The React 19 vitest projects
(`packages/react/vitest.react-19.config.ts` and `packages/browser/vitest.react-19.config.ts`) alias
`react`, `react-dom` and `@testing-library/react` to absolute paths inside this directory's
`node_modules`.

That the aliasing worked is asserted rather than assumed:
[`react-version.test.tsx`](../../packages/react/src/__tests__/react-version.test.tsx) runs in both
projects and checks that React and React DOM report the same major, and that it is the major the
project claims.

## Updating

Bump the versions here. Nothing else in the repository pins React 19.
