# ADR-001: Project Architecture

**Date:** 2026-05-31
**Status:** accepted

## Context

FilterBridge needs to solve a narrow problem: letting developers declare admin list filters once and derive URL params, React state, and backend query DTOs from that single definition.

Architecture decisions made at project start affect how easy it is to add integrations later without breaking existing users.

## Decisions

### Monorepo with pnpm workspaces

The project uses a pnpm workspace monorepo. This allows:

- a demo app to live alongside the library without being part of the published package;
- future adapters (Next.js, TanStack Table) to be added as separate workspace packages;
- each package to have its own versioning when needed;
- shared tooling (TypeScript, Vitest, tsup) to be configured once at the root.

A single package would be simpler today but would make it harder to keep adapters isolated later. The monorepo adds minimal overhead with pnpm workspaces.

### `@filterbridge/core` is framework-free

`@filterbridge/core` contains schema definitions, parsing, and serialization as pure TypeScript. It has no dependency on React, Next.js, or any UI framework.

This means:

- Core can be used in non-React environments (Node.js scripts, CLI tools, server-side code).
- Core is easy to test without a renderer.
- Future adapters can depend on core without pulling in unrelated framework code.

**Rule: core must never import from React or any UI framework.**

### `@filterbridge/react` is a thin adapter

`@filterbridge/react` depends on `@filterbridge/core` and exposes React-specific helpers (hooks). It keeps no filter logic of its own — all state management delegates to core functions.

### Adapters for Next.js, TanStack Table, shadcn/ui are deferred

These integrations are explicitly out of scope for the initial waves. Adding them early would:

- increase maintenance surface before the core API is stable;
- create coupling to ecosystems that may change;
- distract from proving the core value of the library.

They will be considered after the core is stable and published.

### Wave-driven development

The project is built in discrete waves, each with a clear goal and acceptance criteria. This:

- keeps scope from expanding uncontrollably;
- lets each wave produce a reviewable, working increment;
- makes it safe to pause and reassess direction between waves;
- avoids half-finished features accumulating before anything ships.
