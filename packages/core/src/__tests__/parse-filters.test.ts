import { describe, expect, it } from 'vitest'
import { boolean, dateRange, defineFilters, multiSelect, numberRange, select, text } from '../index'
import { parseFilters } from '../parse-filters'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

// ─── DSL ────────────────────────────────────────────────────────────────────

describe('defineFilters', () => {
  it('preserves schema keys', () => {
    expect(Object.keys(schema)).toEqual([
      'search',
      'status',
      'tags',
      'active',
      'createdAt',
      'amount',
    ])
  })

  it('select preserves options', () => {
    const f = defineFilters({ s: select(['a', 'b', 'c']) })
    expect(f.s.options).toEqual(['a', 'b', 'c'])
  })

  it('multiSelect preserves options', () => {
    const f = defineFilters({ m: multiSelect(['x', 'y']) })
    expect(f.m.options).toEqual(['x', 'y'])
  })
})

// ─── text ────────────────────────────────────────────────────────────────────

describe('parseFilters — text', () => {
  it('parses a text value', () => {
    expect(parseFilters(schema, { search: 'invoice' })).toMatchObject({ search: 'invoice' })
  })

  it('trims whitespace', () => {
    expect(parseFilters(schema, { search: '  hello  ' })).toMatchObject({ search: 'hello' })
  })

  it('omits empty string', () => {
    const state = parseFilters(schema, { search: '' })
    expect(state.search).toBeUndefined()
  })

  it('omits whitespace-only string', () => {
    const state = parseFilters(schema, { search: '   ' })
    expect(state.search).toBeUndefined()
  })

  it('omits missing text key', () => {
    const state = parseFilters(schema, {})
    expect(state.search).toBeUndefined()
  })

  it('omits non-string text value', () => {
    const state = parseFilters(schema, { search: 42 })
    expect(state.search).toBeUndefined()
  })
})

// ─── select ──────────────────────────────────────────────────────────────────

describe('parseFilters — select', () => {
  it('parses a valid option', () => {
    expect(parseFilters(schema, { status: 'paid' })).toMatchObject({ status: 'paid' })
  })

  it('omits an invalid value', () => {
    const state = parseFilters(schema, { status: 'unknown' })
    expect(state.status).toBeUndefined()
  })

  it('omits a missing value', () => {
    const state = parseFilters(schema, {})
    expect(state.status).toBeUndefined()
  })

  it('accepts any valid option', () => {
    expect(parseFilters(schema, { status: 'pending' }).status).toBe('pending')
    expect(parseFilters(schema, { status: 'failed' }).status).toBe('failed')
  })
})

// ─── multiSelect ─────────────────────────────────────────────────────────────

describe('parseFilters — multiSelect', () => {
  it('parses a comma-separated string', () => {
    expect(parseFilters(schema, { tags: 'urgent,review' })).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })

  it('parses a comma-separated string with spaces', () => {
    expect(parseFilters(schema, { tags: 'urgent, review' })).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })

  it('parses an array of valid strings', () => {
    expect(parseFilters(schema, { tags: ['urgent', 'archived'] })).toMatchObject({
      tags: ['urgent', 'archived'],
    })
  })

  it('discards invalid values from comma string', () => {
    expect(parseFilters(schema, { tags: 'urgent,invalid,review' })).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })

  it('discards invalid values from array', () => {
    expect(parseFilters(schema, { tags: ['urgent', 'bad', 'review'] })).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })

  it('omits when all values are invalid', () => {
    const state = parseFilters(schema, { tags: 'invalid,also_invalid' })
    expect(state.tags).toBeUndefined()
  })

  it('omits a missing value', () => {
    const state = parseFilters(schema, {})
    expect(state.tags).toBeUndefined()
  })

  it('omits an empty string', () => {
    const state = parseFilters(schema, { tags: '' })
    expect(state.tags).toBeUndefined()
  })
})

// ─── boolean ─────────────────────────────────────────────────────────────────

describe('parseFilters — boolean', () => {
  it('parses "true"', () => {
    expect(parseFilters(schema, { active: 'true' }).active).toBe(true)
  })

  it('parses "false"', () => {
    expect(parseFilters(schema, { active: 'false' }).active).toBe(false)
  })

  it('parses "1"', () => {
    expect(parseFilters(schema, { active: '1' }).active).toBe(true)
  })

  it('parses "0"', () => {
    expect(parseFilters(schema, { active: '0' }).active).toBe(false)
  })

  it('parses actual boolean true', () => {
    expect(parseFilters(schema, { active: true }).active).toBe(true)
  })

  it('parses actual boolean false', () => {
    expect(parseFilters(schema, { active: false }).active).toBe(false)
  })

  it('omits invalid string', () => {
    const state = parseFilters(schema, { active: 'yes' })
    expect(state.active).toBeUndefined()
  })

  it('omits missing value', () => {
    const state = parseFilters(schema, {})
    expect(state.active).toBeUndefined()
  })
})

// ─── dateRange ───────────────────────────────────────────────────────────────

describe('parseFilters — dateRange', () => {
  it('parses from and to', () => {
    const state = parseFilters(schema, {
      createdAtFrom: '2026-01-01',
      createdAtTo: '2026-01-31',
    })
    expect(state.createdAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('parses only from', () => {
    const state = parseFilters(schema, { createdAtFrom: '2026-01-01' })
    expect(state.createdAt).toEqual({ from: '2026-01-01' })
  })

  it('parses only to', () => {
    const state = parseFilters(schema, { createdAtTo: '2026-01-31' })
    expect(state.createdAt).toEqual({ to: '2026-01-31' })
  })

  it('omits when neither from nor to is present', () => {
    const state = parseFilters(schema, {})
    expect(state.createdAt).toBeUndefined()
  })

  it('ignores empty string values', () => {
    const state = parseFilters(schema, { createdAtFrom: '', createdAtTo: '' })
    expect(state.createdAt).toBeUndefined()
  })
})

// ─── numberRange ─────────────────────────────────────────────────────────────

describe('parseFilters — numberRange', () => {
  it('parses min and max as numbers', () => {
    const state = parseFilters(schema, { amountMin: '100', amountMax: '500' })
    expect(state.amount).toEqual({ min: 100, max: 500 })
  })

  it('parses only min', () => {
    const state = parseFilters(schema, { amountMin: '50' })
    expect(state.amount).toEqual({ min: 50 })
  })

  it('parses only max', () => {
    const state = parseFilters(schema, { amountMax: '200' })
    expect(state.amount).toEqual({ max: 200 })
  })

  it('parses float values', () => {
    const state = parseFilters(schema, { amountMin: '1.5', amountMax: '9.99' })
    expect(state.amount).toEqual({ min: 1.5, max: 9.99 })
  })

  it('parses negative values', () => {
    const state = parseFilters(schema, { amountMin: '-10' })
    expect(state.amount).toEqual({ min: -10 })
  })

  it('omits invalid min and keeps valid max', () => {
    const state = parseFilters(schema, { amountMin: 'abc', amountMax: '100' })
    expect(state.amount).toEqual({ max: 100 })
  })

  it('omits when all values are invalid', () => {
    const state = parseFilters(schema, { amountMin: 'NaN', amountMax: 'bad' })
    expect(state.amount).toBeUndefined()
  })

  it('omits when both are missing', () => {
    const state = parseFilters(schema, {})
    expect(state.amount).toBeUndefined()
  })
})

// ─── URLSearchParams ─────────────────────────────────────────────────────────

describe('parseFilters — URLSearchParams input', () => {
  it('accepts URLSearchParams', () => {
    const params = new URLSearchParams('search=invoice&status=paid')
    const state = parseFilters(schema, params)
    expect(state.search).toBe('invoice')
    expect(state.status).toBe('paid')
  })

  it('accepts URLSearchParams with leading ?', () => {
    const params = new URLSearchParams('?search=hello&active=true')
    const state = parseFilters(schema, params)
    expect(state.search).toBe('hello')
    expect(state.active).toBe(true)
  })

  it('parses multiSelect from URLSearchParams comma string', () => {
    const params = new URLSearchParams('tags=urgent%2Creview')
    const state = parseFilters(schema, params)
    expect(state.tags).toEqual(['urgent', 'review'])
  })

  it('parses dateRange from URLSearchParams', () => {
    const params = new URLSearchParams('createdAtFrom=2026-01-01&createdAtTo=2026-01-31')
    const state = parseFilters(schema, params)
    expect(state.createdAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('parses numberRange from URLSearchParams', () => {
    const params = new URLSearchParams('amountMin=100&amountMax=500')
    const state = parseFilters(schema, params)
    expect(state.amount).toEqual({ min: 100, max: 500 })
  })
})
