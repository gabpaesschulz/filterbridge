import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  getDefaultFilterState,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '../index'

const schema = defineFilters({
  search: text({ default: 'invoice' }),
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
  tags: multiSelect(['urgent', 'review', 'archived'], { default: ['urgent'] }),
  archived: boolean({ default: false }),
  createdAt: dateRange({ default: { from: '2026-01-01' } }),
  amount: numberRange({ default: { min: 0, max: 100 } }),
})

type State = Parameters<typeof toSearchParams<typeof schema>>[1]

/** State reaching a serializer at runtime is a plain object; the type is a hint. */
function loose(state: Record<string, unknown>): State {
  return state as State
}

describe('builders accept a default', () => {
  it('stores the default on every filter kind', () => {
    expect(text({ default: 'invoice' })).toEqual({ _kind: 'text', default: 'invoice' })
    expect(select(['a', 'b'], { default: 'b' })).toEqual({
      _kind: 'select',
      options: ['a', 'b'],
      default: 'b',
    })
    expect(multiSelect(['a', 'b'], { default: ['a'] })).toEqual({
      _kind: 'multiSelect',
      options: ['a', 'b'],
      default: ['a'],
    })
    expect(boolean({ default: false })).toEqual({ _kind: 'boolean', default: false })
    expect(dateRange({ default: { from: '2026-01-01' } })).toEqual({
      _kind: 'dateRange',
      default: { from: '2026-01-01' },
    })
    expect(numberRange({ default: { min: 25 } })).toEqual({
      _kind: 'numberRange',
      default: { min: 25 },
    })
  })

  it('accepts a partial range default', () => {
    expect(dateRange({ default: { to: '2026-12-31' } }).default).toEqual({ to: '2026-12-31' })
    expect(numberRange({ default: { max: 500 } }).default).toEqual({ max: 500 })
  })

  it('normalizes the default to the same shape the parsers produce', () => {
    expect(text({ default: '  invoice  ' }).default).toBe('invoice')
    expect(dateRange({ default: { from: ' 2026-01-01 ', to: '  ' } }).default).toEqual({
      from: '2026-01-01',
    })
    expect(numberRange({ default: { min: 0, max: NaN } }).default).toEqual({ min: 0 })
  })

  it('treats a default that normalizes to nothing as no default at all', () => {
    expect(text({ default: '   ' })).toEqual({ _kind: 'text' })
    expect(multiSelect(['a', 'b'], { default: [] })).toEqual({
      _kind: 'multiSelect',
      options: ['a', 'b'],
    })
    expect(dateRange({ default: {} })).toEqual({ _kind: 'dateRange' })
    expect(numberRange({ default: { min: Infinity } })).toEqual({ _kind: 'numberRange' })
  })

  it('copies a multiSelect default so the caller cannot mutate the schema', () => {
    const source: Array<'urgent' | 'review'> = ['urgent']
    const filter = multiSelect(['urgent', 'review'], { default: source })
    source.push('review')
    expect(filter.default).toEqual(['urgent'])
  })
})

describe('option defaults are validated at schema definition', () => {
  it('throws when a select default is not one of its options', () => {
    expect(() => select(['pending', 'paid'], { default: 'bogus' as 'paid' })).toThrow(
      /select\(\): default "bogus" is not one of its options \(pending, paid\)/
    )
  })

  it('throws when any multiSelect default is not one of its options', () => {
    expect(() => multiSelect(['urgent', 'review'], { default: ['urgent', 'zzz' as 'review'] })).toThrow(
      /multiSelect\(\): default "zzz" is not one of its options/
    )
  })

  it('throws for a non-string default reaching an option filter at runtime', () => {
    expect(() => select(['a'], { default: 1 as unknown as 'a' })).toThrow(/is not one of its options/)
  })

  it('accepts a valid default', () => {
    expect(() => select(['pending', 'paid'], { default: 'paid' })).not.toThrow()
    expect(() => multiSelect(['urgent', 'review'], { default: ['review'] })).not.toThrow()
  })
})

describe('parseFilters applies defaults', () => {
  it('fills every default when the input is empty', () => {
    expect(parseFilters(schema, {})).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent'],
      archived: false,
      createdAt: { from: '2026-01-01' },
      amount: { min: 0, max: 100 },
    })
  })

  it('lets an explicit value win over the default', () => {
    const state = parseFilters(schema, {
      search: 'receipt',
      status: 'failed',
      tags: 'review,archived',
      archived: 'true',
      createdAtFrom: '2026-06-01',
      amountMin: '50',
    })

    expect(state.search).toBe('receipt')
    expect(state.status).toBe('failed')
    expect(state.tags).toEqual(['review', 'archived'])
    expect(state.archived).toBe(true)
    expect(state.createdAt).toEqual({ from: '2026-06-01' })
    expect(state.amount).toEqual({ min: 50 })
  })

  it('falls back to the default when the value is present but invalid', () => {
    const state = parseFilters(schema, {
      search: '   ',
      status: 'bogus',
      tags: 'zzz',
      archived: 'maybe',
      createdAtFrom: '',
      amountMin: 'abc',
    })

    expect(state).toEqual(parseFilters(schema, {}))
  })

  it('does not invent values for filters without a default', () => {
    const bare = defineFilters({
      search: text(),
      status: select(['pending', 'paid']),
      tags: multiSelect(['urgent']),
      archived: boolean(),
      createdAt: dateRange(),
      amount: numberRange(),
    })

    expect(parseFilters(bare, {})).toEqual({})
  })

  it('hands out a fresh copy of a default on every parse', () => {
    const first = parseFilters(schema, {})
    first.tags?.push('review')
    first.amount!.min = 999

    const second = parseFilters(schema, {})
    expect(second.tags).toEqual(['urgent'])
    expect(second.amount).toEqual({ min: 0, max: 100 })
  })
})

describe('toSearchParams omits values equal to the default', () => {
  it('produces an empty query string for the default state', () => {
    expect(toSearchParams(schema, parseFilters(schema, {})).toString()).toBe('')
  })

  it('writes only the filters that differ from their default', () => {
    const params = toSearchParams(schema, {
      search: 'invoice',
      status: 'failed',
      tags: ['urgent'],
      archived: false,
      createdAt: { from: '2026-01-01' },
      amount: { min: 0, max: 100 },
    })

    expect(params.toString()).toBe('status=failed')
  })

  it('compares text after trimming, like the parser', () => {
    expect(toSearchParams(schema, { search: '  invoice  ' }).toString()).toBe('')
    expect(toSearchParams(schema, { search: 'other' }).get('search')).toBe('other')
  })

  it('treats a reordered multiSelect as a different value', () => {
    const reordered = defineFilters({
      tags: multiSelect(['urgent', 'review'], { default: ['urgent', 'review'] }),
    })

    expect(toSearchParams(reordered, { tags: ['urgent', 'review'] }).toString()).toBe('')
    expect(toSearchParams(reordered, { tags: ['review', 'urgent'] }).get('tags')).toBe(
      'review,urgent'
    )
  })

  it('writes both sides of a range that differs from the default on one side', () => {
    const params = toSearchParams(schema, { amount: { min: 0, max: 500 } })
    expect(params.get('amountMin')).toBe('0')
    expect(params.get('amountMax')).toBe('500')
  })

  it('writes a partial range that the default fully covers', () => {
    // { min: 0 } is not { min: 0, max: 100 } — omitting it would parse back as
    // the full default range and silently widen the filter.
    expect(toSearchParams(schema, { amount: { min: 0 } }).toString()).toBe('amountMin=0')
  })

  it('still drops a value the schema forbids rather than comparing it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(toSearchParams(schema, loose({ status: 'bogus' })).toString()).toBe('')
    vi.restoreAllMocks()
  })
})

describe('toQueryDto omits values equal to the default', () => {
  it('returns an empty DTO for the default state', () => {
    expect(toQueryDto(schema, parseFilters(schema, {}))).toEqual({})
  })

  it('keeps only what differs from the default', () => {
    const dto = toQueryDto(schema, {
      search: 'receipt',
      status: 'paid',
      tags: ['urgent'],
      archived: true,
      createdAt: { from: '2026-01-01' },
      amount: { min: 25 },
    })

    expect(dto).toEqual({ search: 'receipt', archived: true, amount: { min: 25 } })
  })

  it('is restored to a full query by merging the schema defaults back in', () => {
    const state = parseFilters(schema, { status: 'failed' })

    // The DTO carries only the one filter that is away from its default; a
    // backend that does not know the schema gets the full query from the merge.
    expect(toQueryDto(schema, state)).toEqual({ status: 'failed' })
    expect({ ...getDefaultFilterState(schema), ...toQueryDto(schema, state) }).toEqual({
      search: 'invoice',
      status: 'failed',
      tags: ['urgent'],
      archived: false,
      createdAt: { from: '2026-01-01' },
      amount: { min: 0, max: 100 },
    })
  })
})

/**
 * The one place option B loses information, pinned deliberately rather than
 * left to be rediscovered: "cleared" and "at its default" produce the same
 * empty query string, so they are the same URL. `@filterbridge/react`'s
 * `clear(key)` and `reset()` are therefore not durable for a defaulted filter.
 *
 * If this ever stops being true, the trade-off documented in
 * `docs/api/core.md#what-this-costs` and `docs/api/react.md` changed and both
 * need updating — this test failing is the signal to do that, not to relax it.
 */
describe('a cleared filter is indistinguishable from its default in the URL', () => {
  it('serializes a cleared filter and a defaulted one to the same empty query', () => {
    expect(toSearchParams(schema, loose({})).toString()).toBe('')
    expect(toSearchParams(schema, getDefaultFilterState(schema)).toString()).toBe('')
  })

  it('brings the default back when a cleared state is re-parsed', () => {
    const cleared = loose({})
    expect(parseFilters(schema, toSearchParams(schema, cleared))).toEqual(
      getDefaultFilterState(schema)
    )
    expect(parseFilters(schema, toSearchParams(schema, cleared))).not.toEqual(cleared)
  })

  it('leaves a filter without a default genuinely clearable', () => {
    const mixed = defineFilters({
      status: select(['pending', 'paid'], { default: 'paid' }),
      search: text(),
    })
    expect(parseFilters(mixed, toSearchParams(mixed, {}))).toEqual({ status: 'paid' })
  })

  it('still lets one side of a range be cleared, since the other side keeps the key present', () => {
    // A partial clear survives: `amountMax` alone parses to `{ max: … }`, which
    // is not undefined, so the default is never substituted.
    const params = toSearchParams(schema, loose({ amount: { max: 100 } }))
    expect(params.toString()).toBe('amountMax=100')
    expect(parseFilters(schema, params).amount).toEqual({ max: 100 })
  })
})

describe('getDefaultFilterState', () => {
  it('returns every configured default', () => {
    expect(getDefaultFilterState(schema)).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent'],
      archived: false,
      createdAt: { from: '2026-01-01' },
      amount: { min: 0, max: 100 },
    })
  })

  it('agrees with parsing an empty input', () => {
    expect(getDefaultFilterState(schema)).toEqual(parseFilters(schema, {}))
    expect(getDefaultFilterState(schema)).toEqual(parseFilters(schema, new URLSearchParams()))
  })

  it('returns an empty object for a schema without defaults', () => {
    const bare = defineFilters({ search: text(), status: select(['a', 'b']) })
    expect(getDefaultFilterState(bare)).toEqual({})
  })

  it('omits filters that have no default', () => {
    const mixed = defineFilters({
      search: text(),
      status: select(['pending', 'paid'], { default: 'pending' }),
    })

    expect(getDefaultFilterState(mixed)).toEqual({ status: 'pending' })
  })

  it('returns copies, not the schema objects', () => {
    const first = getDefaultFilterState(schema)
    first.tags?.push('review')
    first.createdAt!.to = '2026-12-31'

    expect(getDefaultFilterState(schema).tags).toEqual(['urgent'])
    expect(getDefaultFilterState(schema).createdAt).toEqual({ from: '2026-01-01' })
  })
})

/** Deterministic LCG: the property test must fail on the same case every run. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const valuePools: Record<string, unknown[]> = {
  search: [undefined, 'invoice', 'receipt', '', '  invoice  ', 42],
  status: [undefined, 'paid', 'failed', 'bogus', null],
  tags: [undefined, [], ['urgent'], ['review', 'urgent'], ['urgent', 'zzz'], ['zzz']],
  archived: [undefined, true, false, 'true'],
  createdAt: [
    undefined,
    {},
    { from: '2026-01-01' },
    { from: '2026-01-01', to: '2026-01-31' },
    { to: '2026-01-31' },
    { from: '', to: '  ' },
  ],
  amount: [undefined, {}, { min: 0 }, { min: 0, max: 100 }, { min: 50, max: 100 }, { max: NaN }],
}

function generateState(random: () => number): Record<string, unknown> {
  const state: Record<string, unknown> = {}
  for (const [key, pool] of Object.entries(valuePools)) {
    const value = pool[Math.floor(random() * pool.length)]
    if (value !== undefined) state[key] = value
  }
  return state
}

describe('roundtrip with defaults: parse(toSearchParams(state)) is a fixed point', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('holds for 500 generated states against a schema where every filter has a default', () => {
    const random = makeRandom(0x5eed)

    for (let i = 0; i < 500; i++) {
      const state = generateState(random)
      const message = `state: ${JSON.stringify(state)}`

      const cleaned = parseFilters(schema, toSearchParams(schema, loose(state)))

      // A state that already went through a parse must survive the next round
      // trip untouched — the defaults omitted from the URL come back identical.
      expect(parseFilters(schema, toSearchParams(schema, cleaned)), message).toEqual(cleaned)
      expect(toSearchParams(schema, cleaned).toString(), message).toBe(
        toSearchParams(schema, parseFilters(schema, toSearchParams(schema, cleaned))).toString()
      )

      // Defaults are never absent from a parsed state.
      expect(Object.keys(cleaned).sort(), message).toEqual(Object.keys(schema).sort())
    }
  })

  it('keeps toQueryDto in agreement with the serialized URL', () => {
    const random = makeRandom(0xc0ffee)

    for (let i = 0; i < 500; i++) {
      const state = generateState(random)
      const message = `state: ${JSON.stringify(state)}`
      const cleaned = parseFilters(schema, toSearchParams(schema, loose(state)))

      // Both serializers drop exactly the filters sitting at their default, so
      // the DTO keys are the schema keys the URL also carries.
      const dtoKeys = Object.keys(toQueryDto(schema, cleaned)).sort()
      const urlKeys = new Set(
        [...toSearchParams(schema, cleaned).keys()].map((key) =>
          key.replace(/(From|To|Min|Max)$/, '')
        )
      )
      expect(dtoKeys, message).toEqual([...urlKeys].sort())
    }
  })
})
