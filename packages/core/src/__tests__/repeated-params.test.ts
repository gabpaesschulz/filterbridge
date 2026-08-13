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

// ─── multiSelect ─────────────────────────────────────────────────────────────

describe('parseFilters — repeated params, multiSelect', () => {
  it('keeps every value from a repeated param', () => {
    expect(parseFilters(schema, new URLSearchParams('tags=urgent&tags=review'))).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })

  it('mixes repeated params with comma-separated values', () => {
    expect(
      parseFilters(schema, new URLSearchParams('tags=urgent,review&tags=archived'))
    ).toMatchObject({ tags: ['urgent', 'review', 'archived'] })
  })

  it('preserves URL order', () => {
    expect(parseFilters(schema, new URLSearchParams('tags=archived&tags=urgent'))).toMatchObject({
      tags: ['archived', 'urgent'],
    })
  })

  it('discards invalid values from a repeated param', () => {
    expect(parseFilters(schema, new URLSearchParams('tags=urgent&tags=nope'))).toMatchObject({
      tags: ['urgent'],
    })
  })

  it('omits the filter when every repeated value is invalid', () => {
    expect(parseFilters(schema, new URLSearchParams('tags=nope&tags=alsonope')).tags).toBeUndefined()
  })

  it('ignores empty repeated values', () => {
    expect(parseFilters(schema, new URLSearchParams('tags=urgent&tags=&tags=review'))).toMatchObject(
      { tags: ['urgent', 'review'] }
    )
  })

  it('accepts a repeated param passed as a plain-record array', () => {
    expect(parseFilters(schema, { tags: ['urgent', 'review'] })).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })

  it('splits comma-separated values inside a plain-record array', () => {
    expect(parseFilters(schema, { tags: ['urgent,review'] })).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })
})

// ─── scalar filters ──────────────────────────────────────────────────────────

describe('parseFilters — repeated params, scalar filters', () => {
  it('text takes the first value', () => {
    expect(parseFilters(schema, new URLSearchParams('search=a&search=b'))).toMatchObject({
      search: 'a',
    })
  })

  it('select takes the first value', () => {
    expect(parseFilters(schema, new URLSearchParams('status=paid&status=failed'))).toMatchObject({
      status: 'paid',
    })
  })

  it('select still rejects an invalid first value', () => {
    expect(parseFilters(schema, new URLSearchParams('status=bogus&status=paid')).status).toBeUndefined()
  })

  it('boolean takes the first value', () => {
    expect(parseFilters(schema, new URLSearchParams('active=true&active=false'))).toMatchObject({
      active: true,
    })
  })

  it('dateRange takes the first value on each side', () => {
    const state = parseFilters(
      schema,
      new URLSearchParams('createdAtFrom=2026-01-01&createdAtFrom=2026-02-01&createdAtTo=2026-03-01')
    )
    expect(state).toMatchObject({ createdAt: { from: '2026-01-01', to: '2026-03-01' } })
  })

  it('numberRange takes the first value on each side', () => {
    const state = parseFilters(schema, new URLSearchParams('amountMin=100&amountMin=200&amountMax=500'))
    expect(state).toMatchObject({ amount: { min: 100, max: 500 } })
  })
})

// ─── unchanged behavior ──────────────────────────────────────────────────────

describe('parseFilters — single-valued input is unchanged', () => {
  it('plain record with a comma-separated multiSelect', () => {
    expect(parseFilters(schema, { tags: 'urgent,review' })).toMatchObject({
      tags: ['urgent', 'review'],
    })
  })

  it('URLSearchParams without repetition', () => {
    const params = new URLSearchParams(
      'search=invoice&status=paid&tags=urgent,review&active=false&createdAtFrom=2026-01-01&amountMin=10'
    )
    expect(parseFilters(schema, params)).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent', 'review'],
      active: false,
      createdAt: { from: '2026-01-01' },
      amount: { min: 10 },
    })
  })

  it('round-trips a repeated param through toSearchParams as a comma-separated value', () => {
    const state = parseFilters(schema, new URLSearchParams('tags=urgent&tags=review'))
    const reparsed = parseFilters(schema, new URLSearchParams('tags=urgent,review'))
    expect(state).toEqual(reparsed)
  })
})
