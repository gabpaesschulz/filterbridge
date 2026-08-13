import { describe, expect, it } from 'vitest'
import type { InferFilterState } from '../index'
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

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

// ---------------------------------------------------------------------------
// text
// ---------------------------------------------------------------------------

describe('empty and whitespace text', () => {
  it('omits an empty string from toSearchParams', () => {
    expect(toSearchParams(schema, { search: '' }).toString()).toBe('')
  })

  it('omits a whitespace-only string from toSearchParams', () => {
    expect(toSearchParams(schema, { search: '   ' }).toString()).toBe('')
  })

  it('omits an empty string from toQueryDto', () => {
    expect(toQueryDto(schema, { search: '' })).toEqual({})
  })

  it('omits a whitespace-only string from toQueryDto', () => {
    expect(JSON.stringify(toQueryDto(schema, { search: '   ' }))).toBe('{}')
  })

  it('trims surrounding whitespace in toSearchParams', () => {
    expect(toSearchParams(schema, { search: '  invoice  ' }).get('search')).toBe('invoice')
  })

  it('trims surrounding whitespace in toQueryDto', () => {
    expect(toQueryDto(schema, { search: '  invoice  ' }).search).toBe('invoice')
  })

  it('produces the same URL for a padded and an unpadded value', () => {
    const padded = toSearchParams(schema, { search: ' foo ' }).toString()
    const plain = toSearchParams(schema, { search: 'foo' }).toString()
    expect(padded).toBe(plain)
  })

  it('preserves inner whitespace', () => {
    expect(toQueryDto(schema, { search: ' paid invoice ' }).search).toBe('paid invoice')
  })
})

// ---------------------------------------------------------------------------
// dateRange
// ---------------------------------------------------------------------------

describe('empty dateRange sides', () => {
  it('omits an empty from side in toQueryDto', () => {
    const dto = toQueryDto(schema, { createdAt: { from: '', to: '2026-01-01' } })
    expect(dto.createdAt).toEqual({ to: '2026-01-01' })
    expect('from' in (dto.createdAt as object)).toBe(false)
  })

  it('omits an empty to side in toQueryDto', () => {
    const dto = toQueryDto(schema, { createdAt: { from: '2026-01-01', to: '' } })
    expect(dto.createdAt).toEqual({ from: '2026-01-01' })
  })

  it('drops the key when both sides are empty', () => {
    expect(toQueryDto(schema, { createdAt: { from: '', to: '' } }).createdAt).toBeUndefined()
    expect(toQueryDto(schema, { createdAt: { from: '  ', to: '  ' } }).createdAt).toBeUndefined()
  })

  it('trims surviving sides in toQueryDto', () => {
    const dto = toQueryDto(schema, { createdAt: { from: ' 2026-01-01 ', to: ' 2026-01-31 ' } })
    expect(dto.createdAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('omits empty sides in toSearchParams', () => {
    const params = toSearchParams(schema, { createdAt: { from: '', to: '2026-01-01' } })
    expect(params.has('createdAtFrom')).toBe(false)
    expect(params.get('createdAtTo')).toBe('2026-01-01')
  })

  it('trims surviving sides in toSearchParams', () => {
    const params = toSearchParams(schema, { createdAt: { from: ' 2026-01-01 ' } })
    expect(params.get('createdAtFrom')).toBe('2026-01-01')
  })

  it('does not reuse the caller range object', () => {
    const createdAt = { from: '2026-01-01', to: '2026-01-31' }
    const dto = toQueryDto(schema, { createdAt })
    expect(dto.createdAt).toEqual(createdAt)
    expect(dto.createdAt).not.toBe(createdAt)
  })
})

// ---------------------------------------------------------------------------
// No empty string reaches the output
// ---------------------------------------------------------------------------

describe('no empty string reaches the output', () => {
  it('never emits an empty string in the DTO', () => {
    const dto = toQueryDto(schema, {
      search: '   ',
      createdAt: { from: '', to: '  ' },
      amount: { min: NaN },
      tags: [],
    })
    expect(JSON.stringify(dto)).toBe('{}')
  })

  it('never emits an empty value in the query string', () => {
    const params = toSearchParams(schema, {
      search: '   ',
      createdAt: { from: '', to: '  ' },
      tags: [],
    })
    expect(params.toString()).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Idempotence: parse -> DTO equals DTO of the same logical state
// ---------------------------------------------------------------------------

describe('idempotence with parseFilters', () => {
  const cases: Array<{
    name: string
    params: Record<string, string>
    state: InferFilterState<typeof schema>
  }> = [
    {
      name: 'padded text',
      params: { search: '  invoice  ' },
      state: { search: '  invoice  ' },
    },
    {
      name: 'whitespace-only text',
      params: { search: '   ' },
      state: { search: '   ' },
    },
    {
      name: 'half-empty date range',
      params: { createdAtFrom: '', createdAtTo: '2026-01-31' },
      state: { createdAt: { from: '', to: '2026-01-31' } },
    },
    {
      name: 'fully empty date range',
      params: { createdAtFrom: '', createdAtTo: '' },
      state: { createdAt: { from: '', to: '' } },
    },
    {
      name: 'full state',
      params: {
        search: 'invoice',
        status: 'paid',
        tags: 'urgent,review',
        active: 'true',
        createdAtFrom: '2026-01-01',
        createdAtTo: '2026-01-31',
        amountMin: '100',
        amountMax: '500',
      },
      state: {
        search: 'invoice',
        status: 'paid',
        tags: ['urgent', 'review'],
        active: true,
        createdAt: { from: '2026-01-01', to: '2026-01-31' },
        amount: { min: 100, max: 500 },
      },
    },
  ]

  for (const { name, params, state } of cases) {
    it(`produces the same DTO from parsed and raw state — ${name}`, () => {
      expect(toQueryDto(schema, parseFilters(schema, params))).toEqual(toQueryDto(schema, state))
    })
  }

  it('round-trips a padded value to a stable URL', () => {
    const first = toSearchParams(schema, { search: '  invoice  ' })
    const second = toSearchParams(schema, parseFilters(schema, first))
    expect(second.toString()).toBe(first.toString())
  })

  it('round-trips a half-empty range to a stable DTO', () => {
    const state = { createdAt: { from: '', to: '2026-01-31' } }
    const once = toQueryDto(schema, state)
    const twice = toQueryDto(schema, parseFilters(schema, toSearchParams(schema, state)))
    expect(twice).toEqual(once)
  })
})
