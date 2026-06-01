# Non-goals

This document lists things FilterBridge explicitly does not try to do. The boundaries are intentional.

---

## Table rendering

FilterBridge is not a table component. It has no concept of rows, columns, cells, or rendering.

For table rendering, use TanStack Table, AG Grid, or a similar headless table library. FilterBridge can sit alongside them and handle the filter contract.

---

## Replacing TanStack Table

TanStack Table has a built-in column filter model. FilterBridge is not a competitor to that model — it solves a different, smaller problem.

TanStack Table column filters are designed to work closely with the table's data pipeline. FilterBridge filter state is designed to work with URLs and backend APIs. These two concerns are related but distinct.

A future adapter could translate FilterBridge state into TanStack column filters. That adapter would be thin.

---

## Replacing nuqs

nuqs is a React hook for syncing state with URL query strings. If that is all you need, nuqs may be the right tool.

FilterBridge adds a typed schema layer on top: it defines *what* the filters are, not just *where* their values live. The schema drives parsing, serialization format, and backend DTO shape. The tradeoff is that FilterBridge is more opinionated about filter types.

FilterBridge does not currently sync with the browser URL at all. A future adapter could use nuqs (or the Next.js router) as the backing store for `useFilterBridge` state.

---

## Form library

FilterBridge is not a form library. It does not manage form submission, validation errors, touched/dirty state, or complex field dependencies.

For complex filter forms, you can use React Hook Form or Formik and connect the values to `bridge.set` / `bridge.setMany` in an `onChange` handler.

---

## UI components

FilterBridge ships no React components. There are no `<Select>`, `<DatePicker>`, `<SearchInput>`, or `<ActiveFilterChips>` components.

A future `@filterbridge/shadcn` package could provide demo-quality UI components. These would be optional and would not be a dependency of the core library.

---

## Backend query builder

FilterBridge produces a clean DTO from filter state. It does not generate SQL, GraphQL, Prisma queries, or Drizzle expressions.

The DTO is a plain object you pass to your own backend or API client. What happens on the other side is outside the library's scope.

---

## Validation library

FilterBridge does not do rich field validation. It parses known filter types with fixed rules and discards invalid values. It does not:

- report validation errors
- show error messages
- enforce min/max constraints on numbers
- validate date ranges (e.g., ensure `from` is before `to`)
- support custom validation rules

For validation, use Zod, Valibot, or your form library's validation system.

---

## Pagination and sorting

FilterBridge does not manage pagination (page number, page size) or sorting (sort column, sort direction).

These are common in admin screens but are different concerns from filter state. They may be addressed in a future package or as explicit extensions to the schema type system.

---

## Routing integration

FilterBridge does not integrate with any router (Next.js, React Router, TanStack Router). The `useFilterBridge` hook manages in-memory state only.

URL synchronization is out of scope for the current version. A future `@filterbridge/next` package would provide App Router helpers.

---

## State management library

FilterBridge is not a Zustand store, a Redux slice, or a Jotai atom. It uses plain React `useState` internally.

If you want your filter state in a global store, you can manage that yourself: call `bridge.set` / `bridge.reset` from your store actions, and initialize the hook with state from your store.

---

## Async filter options

FilterBridge does not support loading select options from an API. Options must be defined statically in the schema at build time.

Dynamic options (e.g., a list of users fetched from an API) are out of scope for the current version.

---

## A full admin framework

FilterBridge is not trying to become an opinionated admin scaffold, a generator, or an all-in-one dashboard toolkit. The goal is a small, focused library that does one thing well and composes cleanly with the rest of the ecosystem.
