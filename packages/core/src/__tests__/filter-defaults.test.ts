import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  getDefaultFilterState,
  isAtDefault,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '../index'

/**
 * Defaults are only accepted by filters whose value space is a fixed,
 * enumerable set. `text`, `dateRange` and `numberRange` do not take one — see
 * `docs/decisions/002-default-values.md` for the criterion.
 */
const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'], { default: 'paid' }),
  tags: multiSelect(['urgent', 'review', 'archived'], { default: ['urgent'] }),
  archived: boolean({ default: false }),
  createdAt: dateRange(),
  amount: numberRange(),
})

/** The three keys that carry a default, in schema order. */
const defaultedKeys = ['status', 'tags', 'archived']

type State = Parameters<typeof toSearchParams<typeof schema>>[1]

/** State reaching a serializer at runtime is a plain object; the type is a hint. */
function loose(state: Record<string, unknown>): State {
  return state as State
}

describe('which builders accept a default', () => {
  it('stores the default on the three enumerable filter kinds', () => {
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
  })

  it('leaves the continuous-entry filters with no default at all', () => {
    // The restriction is enforced by the type signature, not at runtime: these
    // builders take no argument, so a default is a compile error rather than a
    // value that gets validated away. Nothing to assert but the shape.
    expect(text()).toEqual({ _kind: 'text' })
    expect(dateRange()).toEqual({ _kind: 'dateRange' })
    expect(numberRange()).toEqual({ _kind: 'numberRange' })
  })

  it('copies a multiSelect default so the caller cannot mutate the schema', () => {
    const source: Array<'a' | 'b'> = ['a']
    const filter = multiSelect(['a', 'b'], { default: source })
    source.push('b')
    expect(filter.default).toEqual(['a'])
  })

  it('treats an empty multiSelect default as no default at all', () => {
    expect(multiSelect(['a', 'b'], { default: [] })).toEqual({
      _kind: 'multiSelect',
      options: ['a', 'b'],
    })
  })
})

describe('option defaults are validated at schema definition', () => {
  it('throws when a select default is not one of its options', () => {
    expect(() => select(['pending', 'paid'], { default: 'bogus' as 'paid' })).toThrow(
      /default "bogus" is not one of its options/
    )
  })

  it('throws when any multiSelect default is not one of its options', () => {
    expect(() => multiSelect(['a', 'b'], { default: ['a', 'zzz' as 'a'] })).toThrow(
      /is not one of its options/
    )
  })

  it('accepts a valid default', () => {
    expect(() => select(['pending', 'paid'], { default: 'paid' })).not.toThrow()
  })
})

describe('parseFilters applies defaults', () => {
  it('fills every default when the input is empty', () => {
    expect(parseFilters(schema, {})).toEqual({
      status: 'paid',
      tags: ['urgent'],
      archived: false,
    })
  })

  it('lets an explicit value win over the default', () => {
    expect(parseFilters(schema, { status: 'failed', archived: 'true' })).toMatchObject({
      status: 'failed',
      archived: true,
    })
  })

  it('falls back to the default when the value is present but invalid', () => {
    expect(parseFilters(schema, { status: 'bogus' }).status).toBe('paid')
    expect(parseFilters(schema, { archived: 'maybe' }).archived).toBe(false)
    expect(parseFilters(schema, { tags: 'zzz' }).tags).toEqual(['urgent'])
  })

  it('does not invent values for filters without a default', () => {
    const parsed = parseFilters(schema, {})
    expect(parsed.search).toBeUndefined()
    expect(parsed.createdAt).toBeUndefined()
    expect(parsed.amount).toBeUndefined()
  })

  it('hands out a fresh copy of a default on every parse', () => {
    const first = parseFilters(schema, {})
    first.tags?.push('review')
    expect(parseFilters(schema, {}).tags).toEqual(['urgent'])
  })
})

describe('toSearchParams omits values equal to the default', () => {
  it('produces an empty query string for the default state', () => {
    expect(toSearchParams(schema, getDefaultFilterState(schema)).toString()).toBe('')
  })

  it('writes only the filters that differ from their default', () => {
    const state = { ...getDefaultFilterState(schema), status: 'failed' as const }
    expect(toSearchParams(schema, state).toString()).toBe('status=failed')
  })

  it('treats a reordered multiSelect as a different value', () => {
    const state = loose({ ...getDefaultFilterState(schema), tags: ['review', 'urgent'] })
    expect(toSearchParams(schema, state).get('tags')).toBe('review,urgent')
  })

  it('still writes a filter that has no default', () => {
    const state = loose({ ...getDefaultFilterState(schema), search: 'acme' })
    expect(toSearchParams(schema, state).toString()).toBe('search=acme')
  })

  it('still drops a value the schema forbids rather than comparing it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(toSearchParams(schema, loose({ status: 'bogus' })).toString()).toBe('')
    warn.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// The defect this behavior exists to prevent
// ---------------------------------------------------------------------------

describe('toQueryDto carries the defaults', () => {
  it('a virgin page sends the default filters to the backend', () => {
    // The bug this pins: a page nobody has touched IS filtering — the control
    // reads "paid" — and its URL is empty because the default is omitted, which
    // is safe only because parseFilters puts it back. The DTO has no such
    // decompressor: it leaves for a backend that cannot know the schema. When
    // it omitted the default too, the screen showed "Status: paid" while the
    // backend, handed {}, returned every row including pending and failed.
    const virgin = parseFilters(schema, new URLSearchParams(''))

    expect(virgin).toEqual({ status: 'paid', tags: ['urgent'], archived: false })
    expect(toSearchParams(schema, virgin).toString()).toBe('')
    expect(toQueryDto(schema, virgin)).toEqual({
      status: 'paid',
      tags: ['urgent'],
      archived: false,
    })
  })

  it('sends the defaults even when the caller state does not contain them', () => {
    // Same fallback rule parseFilters uses, so a hand-built or cleared state
    // cannot mean something different from the URL it would serialize to.
    expect(toQueryDto(schema, loose({}))).toEqual({
      status: 'paid',
      tags: ['urgent'],
      archived: false,
    })
  })

  it('substitutes the default for a value the schema forbids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(toQueryDto(schema, loose({ status: 'bogus' })).status).toBe('paid')
    warn.mockRestore()
  })

  it('keeps a value that differs from the default', () => {
    const state = loose({ ...getDefaultFilterState(schema), status: 'failed', search: 'acme' })
    expect(toQueryDto(schema, state)).toEqual({
      status: 'failed',
      tags: ['urgent'],
      archived: false,
      search: 'acme',
    })
  })

  it('never omits a defaulted key, whatever the input', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const input of [{}, { status: 'bogus' }, { tags: [] }, { archived: null }]) {
      expect(Object.keys(toQueryDto(schema, loose(input)))).toEqual(
        expect.arrayContaining(defaultedKeys)
      )
    }
    warn.mockRestore()
  })

  it('leaves a schema without defaults producing a DTO of only what was set', () => {
    const bare = defineFilters({ search: text(), status: select(['a', 'b']) })
    expect(toQueryDto(bare, {})).toEqual({})
    expect(toQueryDto(bare, { search: 'x' })).toEqual({ search: 'x' })
  })
})

describe('isAtDefault', () => {
  it('answers for the enumerable kinds', () => {
    expect(isAtDefault(schema.status, 'paid')).toBe(true)
    expect(isAtDefault(schema.status, 'failed')).toBe(false)
    expect(isAtDefault(schema.archived, false)).toBe(true)
    expect(isAtDefault(schema.tags, ['urgent'])).toBe(true)
    expect(isAtDefault(schema.tags, ['review', 'urgent'])).toBe(false)
  })

  it('is always false for a filter that cannot have a default', () => {
    expect(isAtDefault(schema.search, 'anything')).toBe(false)
    expect(isAtDefault(schema.createdAt, {})).toBe(false)
    expect(isAtDefault(schema.amount, { min: 0 })).toBe(false)
  })

  it('is false for a filter that declares no default', () => {
    const bare = defineFilters({ status: select(['a', 'b']) })
    expect(isAtDefault(bare.status, 'a')).toBe(false)
  })
})

describe('getDefaultFilterState', () => {
  it('returns every configured default', () => {
    expect(getDefaultFilterState(schema)).toEqual({
      status: 'paid',
      tags: ['urgent'],
      archived: false,
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

  it('omits filters that cannot or do not declare one', () => {
    const mixed = defineFilters({
      search: text(),
      createdAt: dateRange(),
      status: select(['pending', 'paid'], { default: 'pending' }),
    })

    expect(getDefaultFilterState(mixed)).toEqual({ status: 'pending' })
  })

  it('returns copies, not the schema objects', () => {
    const first = getDefaultFilterState(schema)
    first.tags?.push('review')
    expect(getDefaultFilterState(schema).tags).toEqual(['urgent'])
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
    { from: '', to: '  ' },
  ],
  amount: [undefined, {}, { min: 0 }, { min: 50, max: 100 }, { max: NaN }],
}

function generateState(random: () => number): Record<string, unknown> {
  const state: Record<string, unknown> = {}
  for (const [key, pool] of Object.entries(valuePools)) {
    const value = pool[Math.floor(random() * pool.length)]
    if (value !== undefined) state[key] = value
  }
  return state
}

describe('roundtrip with defaults', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('holds for 500 generated states', () => {
    const random = makeRandom(0x5eed)

    for (let i = 0; i < 500; i++) {
      const state = generateState(random)
      const message = `state: ${JSON.stringify(state)}`
      const cleaned = parseFilters(schema, toSearchParams(schema, loose(state)))

      // A state that already went through a parse survives the next round trip
      // untouched — the defaults omitted from the URL come back identical.
      expect(parseFilters(schema, toSearchParams(schema, cleaned)), message).toEqual(cleaned)

      // Defaults are never absent from a parsed state.
      expect(Object.keys(cleaned), message).toEqual(expect.arrayContaining(defaultedKeys))
    }
  })

  it('keeps toQueryDto in agreement with the URL for any state', () => {
    const random = makeRandom(0xc0ffee)

    for (let i = 0; i < 500; i++) {
      const state = generateState(random)
      const message = `state: ${JSON.stringify(state)}`

      // The property the DTO merge exists to satisfy: what the backend is told
      // does not depend on whether the state went through a URL first.
      const direct = toQueryDto(schema, loose(state))
      const viaUrl = toQueryDto(schema, parseFilters(schema, toSearchParams(schema, loose(state))))
      expect(direct, message).toEqual(viaUrl)

      // And every defaulted filter is always described, never left implicit.
      expect(Object.keys(direct), message).toEqual(expect.arrayContaining(defaultedKeys))
    }
  })
})
