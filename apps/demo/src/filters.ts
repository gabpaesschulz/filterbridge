import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  select,
  text,
} from '@filterbridge/core'

export const invoiceFilters = defineFilters({
  search: text(),
  status: select(['draft', 'pending', 'paid', 'failed', 'cancelled'] as const),
  tags: multiSelect(['urgent', 'recurring', 'international', 'manual-review'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

export const exampleState = {
  search: 'acme',
  status: 'paid' as const,
  tags: ['urgent', 'recurring'] as Array<'urgent' | 'recurring' | 'international' | 'manual-review'>,
  archived: false,
  issuedAt: {
    from: '2026-01-01',
    to: '2026-01-31',
  },
  amount: {
    min: 100,
    max: 2500,
  },
}
