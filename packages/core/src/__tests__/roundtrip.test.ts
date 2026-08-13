import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boolean, dateRange, defineFilters, multiSelect, numberRange, select, text } from '../index'
import type { AnyFilter, InferFilterState } from '../index'
import { parseFilters } from '../parse-filters'
import { toQueryDto } from '../query-dto'
import { toSearchParams } from '../search-params'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review', 'archived']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('roundtrip: parseFilters → toSearchParams → parseFilters', () => {
  it('preserves a full state through the roundtrip', () => {
    const original = {
      search: 'invoice',
      status: 'paid' as const,
      tags: ['urgent', 'review'] as Array<'urgent' | 'review' | 'archived'>,
      active: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    }

    const params = toSearchParams(schema, original)
    const reparsed = parseFilters(schema, params)

    expect(reparsed).toEqual(original)
  })

  it('preserves partial state', () => {
    const original = {
      search: 'test',
      active: false,
      amount: { min: 10 },
    }

    const params = toSearchParams(schema, original)
    const reparsed = parseFilters(schema, params)

    expect(reparsed).toEqual(original)
  })

  it('handles empty state without adding spurious keys', () => {
    const params = toSearchParams(schema, {})
    expect(params.toString()).toBe('')

    const reparsed = parseFilters(schema, params)
    expect(reparsed).toEqual({})
  })

  it('roundtrips boolean false correctly', () => {
    const params = toSearchParams(schema, { active: false })
    expect(params.get('active')).toBe('false')

    const reparsed = parseFilters(schema, params)
    expect(reparsed.active).toBe(false)
  })

  describe('invalid values never enter the URL', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('drops a select value the schema forbids instead of putting it in the URL', () => {
      const params = toSearchParams(schema, loose({ status: 'bogus' }))
      expect(params.toString()).toBe('')
      expect(parseFilters(schema, params)).toEqual({})
    })

    it('drops the invalid entries of a multiSelect and keeps the rest', () => {
      const params = toSearchParams(schema, loose({ tags: ['urgent', 'zzz'] }))
      expect(params.get('tags')).toBe('urgent')
    })
  })
})

/**
 * State reaching a serializer from JSON.parse, localStorage, a saved preset or
 * a cast is a plain object at runtime — the inferred type is a compile-time
 * hint only, so the round-trip has to hold for values TypeScript would reject.
 */
function loose<S extends Record<string, AnyFilter>>(
  state: Record<string, unknown>
): InferFilterState<S> {
  return state as InferFilterState<S>
}

/** Deterministic LCG: the property test must fail on the same case every run. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const valuePools: Record<string, unknown[]> = {
  search: [undefined, 'invoice', '', '   ', '  padded  ', 'a,b', 'ünïcode & =?', 42],
  status: [undefined, 'paid', 'pending', 'bogus', '', null, 7, ['paid']],
  tags: [
    undefined,
    [],
    ['urgent'],
    ['urgent', 'review'],
    ['zzz'],
    ['urgent', 'zzz'],
    ['urgent', 'urgent'],
    [null, 'review'],
    'urgent',
  ],
  active: [undefined, true, false, 'true', 0],
  createdAt: [
    undefined,
    {},
    { from: '2026-01-01' },
    { to: '2026-01-31' },
    { from: '2026-01-01', to: '2026-01-31' },
    { from: '', to: '  ' },
  ],
  amount: [
    undefined,
    {},
    { min: 0 },
    { min: 100, max: 500 },
    { min: -5.5 },
    { min: NaN },
    { max: Infinity },
    { min: NaN, max: -Infinity },
  ],
}

function generateState(random: () => number): Record<string, unknown> {
  const state: Record<string, unknown> = {}
  for (const [key, pool] of Object.entries(valuePools)) {
    const value = pool[Math.floor(random() * pool.length)]
    if (value !== undefined) state[key] = value
  }
  return state
}

/**
 * The same six filters, every one of them carrying a default. Defaults invert
 * the serializers (a value at its default emits no param) and the parser (a
 * missing param produces the default), so every property below has to hold on
 * both schemas or the two halves of that feature do not line up.
 */
const defaulted = defineFilters({
  search: text({ default: 'invoice' }),
  status: select(['pending', 'paid', 'failed'], { default: 'pending' }),
  tags: multiSelect(['urgent', 'review', 'archived'], { default: ['urgent'] }),
  active: boolean({ default: false }),
  createdAt: dateRange({ default: { from: '2026-01-01' } }),
  amount: numberRange({ default: { min: 0 } }),
})

const schemas: Array<[string, typeof schema]> = [
  ['no defaults', schema],
  ['every filter defaulted', defaulted],
]

/** Every param key the two schemas above are allowed to emit. */
const schemaKeys = new Set([
  'search',
  'status',
  'tags',
  'active',
  'createdAtFrom',
  'createdAtTo',
  'amountMin',
  'amountMax',
])

/**
 * A DTO is only useful if it survives `JSON.stringify` unchanged. `NaN` and
 * `Infinity` have no JSON literal and come back as `null`, which is how a
 * non-finite number reaches a backend disguised as an explicit null.
 */
function expectJsonSafe(dto: unknown, message: string): void {
  expect(JSON.parse(JSON.stringify(dto)), message).toEqual(dto)
}

describe('roundtrip property: state → URL → state', () => {
  // The generated states are deliberately invalid, so the dev warning would
  // otherwise print thousands of lines.
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(schemas)('holds for 500 generated states — %s', (_label, target) => {
    const random = makeRandom(0x5eed)

    for (let i = 0; i < 500; i++) {
      const state = generateState(random)
      const message = `state: ${JSON.stringify(state)}`

      const params = toSearchParams(target, loose(state))
      const cleaned = parseFilters(target, params)

      // Nothing the schema rejects may reach the URL: re-parsing the output and
      // serializing it again has to produce the exact same query string.
      expect(toSearchParams(target, cleaned).toString(), message).toBe(params.toString())

      // And the cleaned state survives another full round-trip unchanged.
      expect(parseFilters(target, toSearchParams(target, cleaned)), message).toEqual(cleaned)

      // Only keys the schema owns are ever emitted.
      for (const key of params.keys()) {
        expect(schemaKeys.has(key), `${message} — unexpected key ${key}`).toBe(true)
      }
    }
  })

  it.each(schemas)('keeps toQueryDto in agreement with the URL — %s', (_label, target) => {
    const random = makeRandom(0xc0ffee)

    for (let i = 0; i < 500; i++) {
      const state = generateState(random)
      const message = `state: ${JSON.stringify(state)}`
      const cleaned = parseFilters(target, toSearchParams(target, loose(state)))

      // The two serializers are the same function seen from two sides: a value
      // the URL round-trip discards must not survive in the DTO, and vice versa.
      const dto = toQueryDto(target, loose(state))
      expect(dto, message).toEqual(toQueryDto(target, cleaned))
      expectJsonSafe(dto, message)
    }
  })
})

const paramPools: Array<readonly [string, readonly string[]]> = [
  ['search', ['invoice', '', '   ', '  padded  ', 'a,b', 'ünïcode & =?']],
  ['status', ['paid', 'pending', 'bogus', '']],
  ['tags', ['urgent', 'urgent,review', 'zzz', 'urgent,zzz', '', ' review ']],
  ['active', ['true', '1', 'false', '0', 'yes', '']],
  ['createdAtFrom', ['2026-01-01', '', '   ', 'not-a-date']],
  ['createdAtTo', ['2026-01-31', '']],
  ['amountMin', ['100', '-5.5', 'abc', 'NaN', 'Infinity', '1e999', '']],
  ['amountMax', ['500', '0', '-Infinity', '']],
  // Keys the schema does not own, including two near-misses that a sloppy
  // prefix or case-insensitive match would pick up.
  ['page', ['2']],
  ['tags[]', ['urgent']],
  ['STATUS', ['paid']],
]

function generateQuery(random: () => number): URLSearchParams {
  const params = new URLSearchParams()

  for (const [key, pool] of paramPools) {
    const roll = random()
    if (roll < 0.5) continue
    params.append(key, pool[Math.floor(random() * pool.length)])
    // Repeat the key sometimes — the shape that used to lose data (task 1).
    if (roll > 0.9) params.append(key, pool[Math.floor(random() * pool.length)])
  }

  return params
}

describe('roundtrip property: URL → state → URL', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(schemas)('holds for 500 generated query strings — %s', (_label, target) => {
    const random = makeRandom(0xb0a7)

    for (let i = 0; i < 500; i++) {
      const query = generateQuery(random)
      const message = `query: ${query.toString()}`

      const state = parseFilters(target, query)
      const params = toSearchParams(target, state)

      // Whatever a hand-written, hostile or stale URL contains, the state it
      // parses to is stable: serializing it and parsing again changes nothing.
      expect(parseFilters(target, params), message).toEqual(state)
      expect(toSearchParams(target, parseFilters(target, params)).toString(), message).toBe(
        params.toString()
      )

      // Foreign params are never adopted into the schema's own output.
      for (const key of params.keys()) {
        expect(schemaKeys.has(key), `${message} — unexpected key ${key}`).toBe(true)
      }

      expectJsonSafe(toQueryDto(target, state), message)
    }
  })
})
