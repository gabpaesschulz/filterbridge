---
'@filterbridge/core': patch
'@filterbridge/next': patch
---

Internal: every filter kind now derives its URL param key through
`packages/core/src/param-keys.ts`, not just the two range kinds.

No behaviour change — for a scalar filter the derivation is the identity. `core`
gains one export, `scalarParamKey`, for the same reason `dateRangeParamKeys` is
exported: `@filterbridge/next` needs it inside its own `switch`.
