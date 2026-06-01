import { describe, expect, it } from 'vitest'
import { boolean, dateRange, defineFilters, multiSelect, numberRange, select, text } from '../index'
import { toQueryDto } from '../query-dto'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('toQueryDto', () => {
  it('produces a clean DTO from full state', () => {
    const dto = toQueryDto(schema, {
      search: 'invoice',
      status: 'paid',
      tags: ['urgent', 'review'],
      active: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })

    expect(dto).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent', 'review'],
      active: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
  })

  it('omits undefined fields', () => {
    const dto = toQueryDto(schema, { search: 'test' })
    expect(Object.keys(dto)).toEqual(['search'])
  })

  it('omits empty arrays', () => {
    const dto = toQueryDto(schema, { tags: [] })
    expect(dto.tags).toBeUndefined()
  })

  it('omits empty dateRange', () => {
    const dto = toQueryDto(schema, { createdAt: {} })
    expect(dto.createdAt).toBeUndefined()
  })

  it('omits empty numberRange', () => {
    const dto = toQueryDto(schema, { amount: {} })
    expect(dto.amount).toBeUndefined()
  })

  it('preserves partial dateRange with only from', () => {
    const dto = toQueryDto(schema, { createdAt: { from: '2026-01-01' } })
    expect(dto.createdAt).toEqual({ from: '2026-01-01' })
  })

  it('preserves partial dateRange with only to', () => {
    const dto = toQueryDto(schema, { createdAt: { to: '2026-12-31' } })
    expect(dto.createdAt).toEqual({ to: '2026-12-31' })
  })

  it('preserves partial numberRange with only min', () => {
    const dto = toQueryDto(schema, { amount: { min: 50 } })
    expect(dto.amount).toEqual({ min: 50 })
  })

  it('preserves partial numberRange with only max', () => {
    const dto = toQueryDto(schema, { amount: { max: 200 } })
    expect(dto.amount).toEqual({ max: 200 })
  })

  it('includes boolean false (not treated as falsy omit)', () => {
    const dto = toQueryDto(schema, { active: false })
    expect(dto.active).toBe(false)
    expect('active' in dto).toBe(true)
  })

  it('returns empty object for empty state', () => {
    const dto = toQueryDto(schema, {})
    expect(dto).toEqual({})
  })
})
