import { describe, expect, it } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  select,
  text,
} from '@filterbridge/core'
import { toTanStackColumnFilters } from '../to-column-filters'

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

describe('toTanStackColumnFilters', () => {
  it('converts text filter', () => {
    const result = toTanStackColumnFilters(filters, { search: 'acme' })
    expect(result).toContainEqual({ id: 'search', value: 'acme' })
  })

  it('converts select filter', () => {
    const result = toTanStackColumnFilters(filters, { status: 'paid' })
    expect(result).toContainEqual({ id: 'status', value: 'paid' })
  })

  it('converts multiSelect filter', () => {
    const result = toTanStackColumnFilters(filters, { tags: ['urgent', 'review'] })
    expect(result).toContainEqual({ id: 'tags', value: ['urgent', 'review'] })
  })

  it('converts boolean filter with false', () => {
    const result = toTanStackColumnFilters(filters, { archived: false })
    expect(result).toContainEqual({ id: 'archived', value: false })
  })

  it('converts boolean filter with true', () => {
    const result = toTanStackColumnFilters(filters, { archived: true })
    expect(result).toContainEqual({ id: 'archived', value: true })
  })

  it('converts dateRange filter', () => {
    const result = toTanStackColumnFilters(filters, {
      issuedAt: { from: '2026-01-01', to: '2026-01-31' },
    })
    expect(result).toContainEqual({
      id: 'issuedAt',
      value: { from: '2026-01-01', to: '2026-01-31' },
    })
  })

  it('converts numberRange filter', () => {
    const result = toTanStackColumnFilters(filters, {
      amount: { min: 100, max: 2500 },
    })
    expect(result).toContainEqual({ id: 'amount', value: { min: 100, max: 2500 } })
  })

  it('omits undefined filters', () => {
    const result = toTanStackColumnFilters(filters, { search: 'acme' })
    const ids = result.map((f) => f.id)
    expect(ids).not.toContain('status')
    expect(ids).not.toContain('tags')
    expect(ids).not.toContain('archived')
    expect(ids).not.toContain('issuedAt')
    expect(ids).not.toContain('amount')
  })

  it('omits empty array', () => {
    const result = toTanStackColumnFilters(filters, {
      tags: [] as Array<'urgent' | 'review'>,
    })
    const ids = result.map((f) => f.id)
    expect(ids).not.toContain('tags')
  })

  it('preserves schema key order', () => {
    const result = toTanStackColumnFilters(filters, {
      search: 'acme',
      status: 'paid',
      archived: true,
    })
    const ids = result.map((f) => f.id)
    expect(ids.indexOf('search')).toBeLessThan(ids.indexOf('status'))
    expect(ids.indexOf('status')).toBeLessThan(ids.indexOf('archived'))
  })

  it('respects columnIds option', () => {
    const result = toTanStackColumnFilters(
      filters,
      { search: 'acme', issuedAt: { from: '2026-01-01' } },
      { columnIds: { search: 'customerName', issuedAt: 'issuedDate' } }
    )
    expect(result).toContainEqual({ id: 'customerName', value: 'acme' })
    expect(result).toContainEqual({ id: 'issuedDate', value: { from: '2026-01-01' } })
    const ids = result.map((f) => f.id)
    expect(ids).not.toContain('search')
    expect(ids).not.toContain('issuedAt')
  })

  it('does not mutate the state object', () => {
    const state = { search: 'acme', status: 'paid' as const }
    const frozen = Object.freeze({ ...state })
    expect(() => toTanStackColumnFilters(filters, frozen)).not.toThrow()
  })

  it('returns empty array when state is empty', () => {
    const result = toTanStackColumnFilters(filters, {})
    expect(result).toEqual([])
  })
})
