// React-only entry point: `@filterbridge/browser/react`.
//
// It is kept out of the root entry on purpose. `@filterbridge/browser` is
// documented as framework-agnostic and must stay importable in plain Node or a
// non-React app, so React is an *optional* peer dependency and only this file
// imports it.
export { usePopstateSync } from './use-popstate-sync'

export type { UsePopstateSyncOptions } from './types'
