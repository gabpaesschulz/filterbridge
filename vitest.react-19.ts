import { fileURLToPath } from 'node:url'

function dependency(name: string): string {
  return fileURLToPath(new URL(`./tools/react-19/node_modules/${name}`, import.meta.url))
}

const react = dependency('react')
const reactDom = dependency('react-dom')
const testingLibrary = dependency('@testing-library/react')

/**
 * Points a vitest project at the React 19 tree owned by `tools/react-19`.
 *
 * `packages/react` and `packages/browser` declare `react: >=18` as a peer and
 * the suite only ever ran `18.3.x`, so half of that range was a claim nothing
 * checked. These aliases run the same test files a second time against React
 * 19 — see `tools/react-19/README.md` for why the dependency tree lives in its
 * own package instead of as an aliased devDependency here.
 *
 * `@testing-library/react` is aliased along with React itself, and that is the
 * load-bearing part. Vitest externalises `node_modules`, so an externalised RTL
 * resolves `react-dom/client` through Node against its own tree, never through
 * these aliases. Pointing at the copy that lives beside React 19 means Node's
 * own resolution lands on 19 for every hop, with no `server.deps.inline`
 * tuning to keep honest.
 *
 * Anchored patterns, not prefixes: `/^react$/` must not swallow `react-dom`,
 * and the subpath forms have to be listed separately so that `react/jsx-runtime`
 * — injected by the automatic JSX transform, never written by hand — is
 * remapped too. A missed subpath loads a second React and fails as a hook
 * error that reads like a library bug.
 *
 * That all of this worked is asserted rather than assumed, by
 * `packages/react/src/__tests__/react-version.test.tsx`.
 */
export const react19Aliases = [
  { find: /^react$/, replacement: react },
  { find: /^react\//, replacement: `${react}/` },
  { find: /^react-dom$/, replacement: reactDom },
  { find: /^react-dom\//, replacement: `${reactDom}/` },
  { find: /^@testing-library\/react$/, replacement: testingLibrary },
]
