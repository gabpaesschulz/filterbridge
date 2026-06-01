import { describe, expect, it } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '../index'

describe('@filterbridge/core — smoke test', () => {
  it('builds a schema and runs the full pipeline without errors', () => {
    const schema = defineFilters({
      search: text(),
      status: select(['pending', 'paid', 'failed']),
      tags: multiSelect(['urgent', 'review']),
      active: boolean(),
      createdAt: dateRange(),
      amount: numberRange(),
    })

    const state = parseFilters(schema, {
      search: 'invoice',
      status: 'paid',
      tags: 'urgent,review',
      active: 'true',
      createdAtFrom: '2026-01-01',
      createdAtTo: '2026-01-31',
      amountMin: '100',
      amountMax: '500',
    })

    expect(state.search).toBe('invoice')
    expect(state.status).toBe('paid')
    expect(state.tags).toEqual(['urgent', 'review'])
    expect(state.active).toBe(true)
    expect(state.createdAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
    expect(state.amount).toEqual({ min: 100, max: 500 })

    const dto = toQueryDto(schema, state)
    expect(dto).toEqual(state)

    const params = toSearchParams(schema, state)
    expect(params.get('search')).toBe('invoice')
    expect(params.get('status')).toBe('paid')
  })
})
