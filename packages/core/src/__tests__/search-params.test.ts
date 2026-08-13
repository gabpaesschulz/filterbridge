import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boolean, dateRange, defineFilters, multiSelect, numberRange, select, text } from '../index'
import { toSearchParams } from '../search-params'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('toSearchParams', () => {
  it('serializes text', () => {
    const params = toSearchParams(schema, { search: 'invoice' })
    expect(params.get('search')).toBe('invoice')
  })

  it('serializes select', () => {
    const params = toSearchParams(schema, { status: 'paid' })
    expect(params.get('status')).toBe('paid')
  })

  it('serializes multiSelect as comma-separated string', () => {
    const params = toSearchParams(schema, { tags: ['urgent', 'review'] })
    expect(params.get('tags')).toBe('urgent,review')
  })

  it('serializes boolean true', () => {
    const params = toSearchParams(schema, { active: true })
    expect(params.get('active')).toBe('true')
  })

  it('serializes boolean false', () => {
    const params = toSearchParams(schema, { active: false })
    expect(params.get('active')).toBe('false')
  })

  it('serializes dateRange with from and to', () => {
    const params = toSearchParams(schema, {
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
    })
    expect(params.get('createdAtFrom')).toBe('2026-01-01')
    expect(params.get('createdAtTo')).toBe('2026-01-31')
  })

  it('serializes dateRange with only from', () => {
    const params = toSearchParams(schema, { createdAt: { from: '2026-01-01' } })
    expect(params.get('createdAtFrom')).toBe('2026-01-01')
    expect(params.get('createdAtTo')).toBeNull()
  })

  it('serializes numberRange', () => {
    const params = toSearchParams(schema, { amount: { min: 100, max: 500 } })
    expect(params.get('amountMin')).toBe('100')
    expect(params.get('amountMax')).toBe('500')
  })

  it('serializes numberRange with only min', () => {
    const params = toSearchParams(schema, { amount: { min: 50 } })
    expect(params.get('amountMin')).toBe('50')
    expect(params.get('amountMax')).toBeNull()
  })

  it('omits undefined fields', () => {
    const params = toSearchParams(schema, { search: 'hi' })
    expect(params.has('status')).toBe(false)
    expect(params.has('tags')).toBe(false)
    expect(params.has('active')).toBe(false)
  })

  it('omits empty array for multiSelect', () => {
    const params = toSearchParams(schema, { tags: [] })
    expect(params.has('tags')).toBe(false)
  })

  it('omits empty dateRange object', () => {
    const params = toSearchParams(schema, { createdAt: {} })
    expect(params.has('createdAtFrom')).toBe(false)
    expect(params.has('createdAtTo')).toBe(false)
  })

  it('omits empty numberRange object', () => {
    const params = toSearchParams(schema, { amount: {} })
    expect(params.has('amountMin')).toBe(false)
    expect(params.has('amountMax')).toBe(false)
  })

  it('omits a NaN min', () => {
    const params = toSearchParams(schema, { amount: { min: NaN, max: 10 } })
    expect(params.has('amountMin')).toBe(false)
    expect(params.get('amountMax')).toBe('10')
  })

  it('omits a NaN max', () => {
    const params = toSearchParams(schema, { amount: { min: 10, max: NaN } })
    expect(params.get('amountMin')).toBe('10')
    expect(params.has('amountMax')).toBe(false)
  })

  it('omits Infinity and -Infinity', () => {
    const params = toSearchParams(schema, { amount: { min: -Infinity, max: Infinity } })
    expect(params.has('amountMin')).toBe(false)
    expect(params.has('amountMax')).toBe(false)
  })

  it('never emits a non-finite value in the query string', () => {
    const params = toSearchParams(schema, { amount: { min: NaN, max: Infinity } })
    expect(params.toString()).toBe('')
  })

  it('produces keys in schema-definition order', () => {
    const params = toSearchParams(schema, {
      amount: { min: 1 },
      search: 'test',
      active: true,
    })
    const keys = Array.from(params.keys())
    const searchIdx = keys.indexOf('search')
    const activeIdx = keys.indexOf('active')
    const amountIdx = keys.indexOf('amountMin')
    expect(searchIdx).toBeLessThan(activeIdx)
    expect(activeIdx).toBeLessThan(amountIdx)
  })

  it('serializes a full state', () => {
    const params = toSearchParams(schema, {
      search: 'invoice',
      status: 'paid',
      tags: ['urgent', 'review'],
      active: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
    expect(params.toString()).toBe(
      'search=invoice&status=paid&tags=urgent%2Creview&active=true&createdAtFrom=2026-01-01&createdAtTo=2026-01-31&amountMin=100&amountMax=500'
    )
  })
})

type LooseState = Parameters<typeof toSearchParams<typeof schema>>[1]

function loose(state: Record<string, unknown>): LooseState {
  return state as LooseState
}

describe('toSearchParams schema validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('omits a select value outside options', () => {
    const params = toSearchParams(schema, loose({ status: 'bogus' }))
    expect(params.has('status')).toBe(false)
  })

  it('omits a select value that is not a string', () => {
    expect(toSearchParams(schema, loose({ status: 7 })).has('status')).toBe(false)
    expect(toSearchParams(schema, loose({ status: { code: 'paid' } })).has('status')).toBe(false)
    expect(toSearchParams(schema, loose({ status: ['paid'] })).has('status')).toBe(false)
  })

  it('keeps a valid select value', () => {
    expect(toSearchParams(schema, { status: 'failed' }).get('status')).toBe('failed')
  })

  it('filters invalid entries out of a multiSelect', () => {
    const params = toSearchParams(schema, loose({ tags: ['urgent', 'zzz', 'review'] }))
    expect(params.get('tags')).toBe('urgent,review')
  })

  it('omits the multiSelect key when no entry is valid', () => {
    expect(toSearchParams(schema, loose({ tags: ['zzz', 3, null] })).has('tags')).toBe(false)
  })

  it('ignores a multiSelect value that is not an array', () => {
    expect(toSearchParams(schema, loose({ tags: 'urgent' })).has('tags')).toBe(false)
  })

  it('emits nothing at all for a fully invalid state', () => {
    const params = toSearchParams(schema, loose({ status: 'bogus', tags: ['zzz'] }))
    expect(params.toString()).toBe('')
  })
})
