import { describe, expect, it } from 'vitest'
import { filterBridgeFilterFns } from '../filter-fns'

function makeRow(values: Record<string, unknown>) {
  return {
    getValue: (columnId: string) => values[columnId],
  }
}

describe('filterBridgeFilterFns.text', () => {
  const fn = filterBridgeFilterFns.text

  it('matches case-insensitively', () => {
    expect(fn(makeRow({ name: 'Acme Corp' }), 'name', 'acme')).toBe(true)
    expect(fn(makeRow({ name: 'Acme Corp' }), 'name', 'ACME')).toBe(true)
  })

  it('returns false when no match', () => {
    expect(fn(makeRow({ name: 'Acme Corp' }), 'name', 'globex')).toBe(false)
  })

  it('returns true when filter is empty', () => {
    expect(fn(makeRow({ name: 'Acme Corp' }), 'name', '')).toBe(true)
    expect(fn(makeRow({ name: 'Acme Corp' }), 'name', undefined)).toBe(true)
  })
})

describe('filterBridgeFilterFns.select', () => {
  const fn = filterBridgeFilterFns.select

  it('matches equal value', () => {
    expect(fn(makeRow({ status: 'paid' }), 'status', 'paid')).toBe(true)
  })

  it('returns false when not equal', () => {
    expect(fn(makeRow({ status: 'paid' }), 'status', 'pending')).toBe(false)
  })

  it('returns true when filter is empty', () => {
    expect(fn(makeRow({ status: 'paid' }), 'status', undefined)).toBe(true)
    expect(fn(makeRow({ status: 'paid' }), 'status', '')).toBe(true)
  })
})

describe('filterBridgeFilterFns.multiSelect', () => {
  const fn = filterBridgeFilterFns.multiSelect

  it('matches when cell array intersects filter', () => {
    expect(fn(makeRow({ tags: ['urgent', 'review'] }), 'tags', ['urgent'])).toBe(true)
  })

  it('returns false when no intersection', () => {
    expect(fn(makeRow({ tags: ['review'] }), 'tags', ['urgent'])).toBe(false)
  })

  it('matches when cell is scalar and in filter', () => {
    expect(fn(makeRow({ status: 'paid' }), 'status', ['paid', 'pending'])).toBe(true)
  })

  it('returns false when cell scalar not in filter', () => {
    expect(fn(makeRow({ status: 'failed' }), 'status', ['paid', 'pending'])).toBe(false)
  })

  it('returns true when filter is empty array', () => {
    expect(fn(makeRow({ tags: ['urgent'] }), 'tags', [])).toBe(true)
  })

  it('returns true when filter is undefined', () => {
    expect(fn(makeRow({ tags: ['urgent'] }), 'tags', undefined)).toBe(true)
  })
})

describe('filterBridgeFilterFns.boolean', () => {
  const fn = filterBridgeFilterFns.boolean

  it('matches true', () => {
    expect(fn(makeRow({ archived: true }), 'archived', true)).toBe(true)
  })

  it('matches false', () => {
    expect(fn(makeRow({ archived: false }), 'archived', false)).toBe(true)
  })

  it('returns false when boolean mismatch', () => {
    expect(fn(makeRow({ archived: true }), 'archived', false)).toBe(false)
  })

  it('returns true when filter is not boolean', () => {
    expect(fn(makeRow({ archived: true }), 'archived', undefined)).toBe(true)
    expect(fn(makeRow({ archived: true }), 'archived', 'true')).toBe(true)
  })
})

describe('filterBridgeFilterFns.dateRange', () => {
  const fn = filterBridgeFilterFns.dateRange

  it('includes date within from-to range', () => {
    expect(
      fn(makeRow({ date: '2026-01-15' }), 'date', { from: '2026-01-01', to: '2026-01-31' })
    ).toBe(true)
  })

  it('filters by from only', () => {
    expect(fn(makeRow({ date: '2026-01-15' }), 'date', { from: '2026-01-20' })).toBe(false)
    expect(fn(makeRow({ date: '2026-02-01' }), 'date', { from: '2026-01-20' })).toBe(true)
  })

  it('filters by to only', () => {
    expect(fn(makeRow({ date: '2026-01-15' }), 'date', { to: '2026-01-10' })).toBe(false)
    expect(fn(makeRow({ date: '2026-01-05' }), 'date', { to: '2026-01-10' })).toBe(true)
  })

  it('returns true when range is empty', () => {
    expect(fn(makeRow({ date: '2026-01-15' }), 'date', {})).toBe(true)
    expect(fn(makeRow({ date: '2026-01-15' }), 'date', undefined)).toBe(true)
  })
})

describe('filterBridgeFilterFns.numberRange', () => {
  const fn = filterBridgeFilterFns.numberRange

  it('includes value within min-max range', () => {
    expect(fn(makeRow({ amount: 500 }), 'amount', { min: 100, max: 1000 })).toBe(true)
  })

  it('filters by min', () => {
    expect(fn(makeRow({ amount: 50 }), 'amount', { min: 100 })).toBe(false)
    expect(fn(makeRow({ amount: 150 }), 'amount', { min: 100 })).toBe(true)
  })

  it('filters by max', () => {
    expect(fn(makeRow({ amount: 1500 }), 'amount', { max: 1000 })).toBe(false)
    expect(fn(makeRow({ amount: 500 }), 'amount', { max: 1000 })).toBe(true)
  })

  it('returns false when value is NaN and range is active', () => {
    expect(fn(makeRow({ amount: 'not-a-number' }), 'amount', { min: 100 })).toBe(false)
  })

  it('returns true when range is empty', () => {
    expect(fn(makeRow({ amount: 500 }), 'amount', {})).toBe(true)
    expect(fn(makeRow({ amount: 500 }), 'amount', undefined)).toBe(true)
  })
})
