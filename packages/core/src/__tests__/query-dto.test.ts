import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('omits a NaN min and keeps the finite max', () => {
    const dto = toQueryDto(schema, { amount: { min: NaN, max: 10 } })
    expect(dto.amount).toEqual({ max: 10 })
    expect('min' in (dto.amount as object)).toBe(false)
  })

  it('omits a NaN max and keeps the finite min', () => {
    const dto = toQueryDto(schema, { amount: { min: 10, max: NaN } })
    expect(dto.amount).toEqual({ min: 10 })
  })

  it('drops the key when both sides are non-finite', () => {
    expect(toQueryDto(schema, { amount: { min: NaN, max: NaN } }).amount).toBeUndefined()
    expect(toQueryDto(schema, { amount: { min: -Infinity, max: Infinity } }).amount).toBeUndefined()
  })

  it('never serializes a non-finite number as null in JSON', () => {
    const dto = toQueryDto(schema, { amount: { min: NaN, max: Infinity } })
    expect(JSON.stringify(dto)).toBe('{}')
  })

  it('does not reuse the caller range object', () => {
    const amount = { min: 1, max: 2 }
    const dto = toQueryDto(schema, { amount })
    expect(dto.amount).toEqual(amount)
    expect(dto.amount).not.toBe(amount)
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

type LooseState = Parameters<typeof toQueryDto<typeof schema>>[1]

function loose(state: Record<string, unknown>): LooseState {
  return state as LooseState
}

describe('toQueryDto schema validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('omits a select value outside options', () => {
    const dto = toQueryDto(schema, loose({ status: 'bogus' }))
    expect(dto).toEqual({})
  })

  it('omits a select value that is not a string', () => {
    expect(toQueryDto(schema, loose({ status: 7 }))).toEqual({})
    expect(toQueryDto(schema, loose({ status: { code: 'paid' } }))).toEqual({})
    expect(toQueryDto(schema, loose({ status: ['paid'] }))).toEqual({})
  })

  it('keeps a valid select value', () => {
    expect(toQueryDto(schema, { status: 'failed' }).status).toBe('failed')
  })

  it('filters invalid entries out of a multiSelect', () => {
    const dto = toQueryDto(schema, loose({ tags: ['urgent', 'zzz', 'review', 3] }))
    expect(dto.tags).toEqual(['urgent', 'review'])
  })

  it('omits the multiSelect key when no entry is valid', () => {
    expect(toQueryDto(schema, loose({ tags: ['zzz', null] })).tags).toBeUndefined()
  })

  it('does not reuse the caller array', () => {
    const tags = ['urgent', 'review'] as Array<'urgent' | 'review'>
    const dto = toQueryDto(schema, { tags })
    expect(dto.tags).toEqual(tags)
    expect(dto.tags).not.toBe(tags)
  })

  it('ignores a multiSelect value that is not an array', () => {
    expect(toQueryDto(schema, loose({ tags: 'urgent' })).tags).toBeUndefined()
  })
})
