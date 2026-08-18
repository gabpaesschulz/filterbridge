import { boolean, dateRange, defineFilters, multiSelect, select, text } from '@filterbridge/core'

/**
 * One schema, imported by both the server component and the client component.
 * That shared import is the whole point of the pattern — the server parse and
 * the client state cannot drift because there is only one description of the
 * filters.
 *
 * `status` declares a default deliberately. It makes the rule from
 * docs/decisions/002-default-values.md visible on the server side, where it is
 * easiest to get wrong: an empty query string still produces
 * `{ status: 'pending' }`, so the first server render fetches the same rows the
 * URL would have produced with `?status=pending` — and the URL stays clean,
 * because a value at its default is omitted from it.
 */
export const invoiceFilters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const, { default: 'pending' }),
  tags: multiSelect(['urgent', 'recurring', 'overdue'] as const),
  archived: boolean(),
  createdAt: dateRange(),
})
