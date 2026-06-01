import { describe, expect, it } from 'vitest'
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
