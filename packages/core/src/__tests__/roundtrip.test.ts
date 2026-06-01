import { describe, expect, it } from 'vitest'
import { boolean, dateRange, defineFilters, multiSelect, numberRange, select, text } from '../index'
import { parseFilters } from '../parse-filters'
import { toSearchParams } from '../search-params'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('roundtrip: parseFilters → toSearchParams → parseFilters', () => {
  it('preserves a full state through the roundtrip', () => {
    const original = {
      search: 'invoice',
      status: 'paid' as const,
      tags: ['urgent', 'review'] as Array<'urgent' | 'review' | 'archived'>,
      active: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    }

    const params = toSearchParams(schema, original)
    const reparsed = parseFilters(schema, params)

    expect(reparsed).toEqual(original)
  })

  it('preserves partial state', () => {
    const original = {
      search: 'test',
      active: false,
      amount: { min: 10 },
    }

    const params = toSearchParams(schema, original)
    const reparsed = parseFilters(schema, params)

    expect(reparsed).toEqual(original)
  })

  it('handles empty state without adding spurious keys', () => {
    const params = toSearchParams(schema, {})
    expect(params.toString()).toBe('')

    const reparsed = parseFilters(schema, params)
    expect(reparsed).toEqual({})
  })

  it('roundtrips boolean false correctly', () => {
    const params = toSearchParams(schema, { active: false })
    expect(params.get('active')).toBe('false')

    const reparsed = parseFilters(schema, params)
    expect(reparsed.active).toBe(false)
  })
})
