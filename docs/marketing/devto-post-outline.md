# dev.to Post Outline

**Suggested title:** Building a schema-first filter library for React admin dashboards

**Tags:** typescript, react, opensource, webdev

---

## Outline

### 1. The problem

Describe the concrete pain point: admin dashboard filter logic that lives in multiple places simultaneously.

- UI state (useState or a state manager)
- URL search params (manual URLSearchParams wrangling)
- Backend query DTO (API request body or query string)
- Table state (TanStack, AG Grid, etc.)
- Active filter count/chips display

Show a short "before" example with duplicated logic across layers.

### 2. The idea: schema-first filters

Explain the approach: declare filters once as a typed schema, derive everything else.

Show `defineFilters` with all six types and what `InferFilterState` produces.

Emphasize the TypeScript inference story — literal unions from `select` and `multiSelect`.

### 3. Parsing untrusted input

Explain why URL params are untrusted and how `parseFilters` handles that:

- Accepts `Record<string, unknown>` or `URLSearchParams`
- Silently discards invalid values
- Returns a typed, clean state object

Show before/after of manually validating URL params vs. using `parseFilters`.

### 4. Serialization and DTO

Show `toSearchParams` and `toQueryDto`, including what gets stripped.

Explain why deterministic serialization matters for bookmarked URLs, shareable links, and reproducible API calls.

### 5. The React hook

Show `useFilterBridge` with `set`, `clear`, `reset`, and `onChange`.

Mention the automatic empty-value cleanup behavior.

### 6. Package architecture

Explain why five packages instead of one:

- Core is framework-agnostic
- React adapter only brings in React as peer dep
- Each adapter is independent
- Consumers install only what they need

Brief mention of tsup, pnpm workspaces, and the monorepo build setup.

### 7. Testing

Describe the test strategy:

- 299 tests across 17 test files
- Core behavior: parsing, serialization, roundtrip, DTO
- React hook: state management via @testing-library/react
- Browser/TanStack/Next adapters: independent test suites
- Smoke test against packed tarballs (ESM + CJS)

Mention what you tested that surprised you.

### 8. Publishing to npm

Brief notes on the publishing process:

- pnpm workspace + tsup
- ESM + CJS dual output
- `sideEffects: false`
- Smoke test before publish

What tripped you up (if anything).

### 9. Lessons learned

Honest reflection on the process:

- API design is harder than implementation
- Naming things in a small public API matters a lot
- TypeScript generics for DX vs. for internal implementation are different problems
- Documentation as a forcing function for a clean API
- The value of smoke testing against real packed tarballs

### 10. What's next

Brief mention of the roadmap:

- `popstate` handler for browser back/forward
- Repeated query params in multiSelect
- Optional default values per filter
- v1.0 API stabilization

### Closing

Link to:
- GitHub: https://github.com/gabpaesschulz/filterbridge
- npm: https://www.npmjs.com/package/@filterbridge/core

Invite feedback and contributions.

---

*Estimated length: 1500–2500 words with code examples.*
*Write the full article from this outline before publishing.*
