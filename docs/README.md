# FilterBridge Documentation

Documentation index for the FilterBridge project.

---

## API Reference

| Package                  | Reference                                 |
| ------------------------ | ----------------------------------------- |
| `@filterbridge/core`     | [docs/api/core.md](./api/core.md)         |
| `@filterbridge/react`    | [docs/api/react.md](./api/react.md)       |
| `@filterbridge/browser`  | [docs/api/browser.md](./api/browser.md)   |
| `@filterbridge/tanstack` | [docs/api/tanstack.md](./api/tanstack.md) |
| `@filterbridge/next`     | [docs/api/next.md](./api/next.md)         |

---

## Guides

| Guide                                                    | Description                                                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------- |
| [URL synchronization](./guides/url-sync.md)              | Syncing filter state with the browser URL using `@filterbridge/browser` |
| [TanStack Table integration](./guides/tanstack-table.md) | Using FilterBridge with TanStack Table                                  |
| [Next.js App Router](./guides/next-app-router.md)        | Using FilterBridge in Next.js server and client components              |
| [Deploy the demo](./guides/deploy-demo.md)               | How to deploy the demo app to Vercel or Netlify                         |

---

## Concepts

| Document                                            | Description                            |
| --------------------------------------------------- | -------------------------------------- |
| [Why FilterBridge?](./concepts/why-filterbridge.md) | The problem this library solves        |
| [Architecture](./concepts/architecture.md)          | Package structure and dependency graph |
| [Non-goals](./concepts/non-goals.md)                | What FilterBridge will not become      |

---

## Release

| Document                                     | Description                               |
| -------------------------------------------- | ----------------------------------------- |
| [v0.2.0 release notes](./releases/v0.2.0.md) | Current release — hardening, defaults, CI |
| [v0.1.0 release notes](./releases/v0.1.0.md) | Initial experimental release (superseded) |
| [Roadmap](./roadmap.md)                      | Planned and possible future work          |
| [Release checklist](./release-checklist.md)  | Pre-publish validation steps              |

---

## Decisions

Architecture decision records — the reasoning behind choices that are expensive to revisit, kept
separately from the API reference so that "what it does" and "why it does that" do not drift.

| Record                                                 | Subject                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| [ADR-001](./decisions/001-project-architecture.md)     | Monorepo layout, framework-free core, package boundaries                    |
| [ADR-002](./decisions/002-default-values.md)           | Per-filter defaults: URL omission, DTO inclusion, which builders accept one |
| [ADR-003](./decisions/003-test-resolution.md)          | Unit tests resolve to source; `.smoke/` covers the published artifact       |
| [ADR-004](./decisions/004-external-state-sync.md)      | `syncState` over a controlled mode, and where the `popstate` listener lives |
| [ADR-005](./decisions/005-serialization-validation.md) | Serialization validates against the schema and never throws                 |

---

## Sprints

| Sprint                                   | Description                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Sprint 0](./sprints/sprint-0/README.md) | Post-release hardening — correctness fixes, API gaps, CI                                           |
| [Sprint 1](./sprints/sprint-1/README.md) | Ergonomics and debt — formatting in CI, custom range keys, demo contrast, a Next.js example (open) |

---

## Repository links

| Resource                  | Link                                             |
| ------------------------- | ------------------------------------------------ |
| Root README               | [README.md](../README.md)                        |
| Contributing guide        | [CONTRIBUTING.md](../CONTRIBUTING.md)            |
| GitHub repository         | https://github.com/gabpaesschulz/filterbridge    |
| npm: `@filterbridge/core` | https://www.npmjs.com/package/@filterbridge/core |
