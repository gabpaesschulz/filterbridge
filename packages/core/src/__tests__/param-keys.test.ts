import { describe, expect, it } from 'vitest'
import {
  boolean,
  dateRange,
  dateRangeParamKeys,
  defineFilters,
  filterParamKeys,
  getFilterParamKeys,
  multiSelect,
  numberRange,
  numberRangeParamKeys,
  parseFilters,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '../index'
import type { AnyFilter } from '../index'

describe('filterParamKeys', () => {
  it('gives a scalar filter its own name', () => {
    expect(filterParamKeys('search', text())).toEqual(['search'])
    expect(filterParamKeys('status', select(['a'] as const))).toEqual(['status'])
    expect(filterParamKeys('tags', multiSelect(['a'] as const))).toEqual(['tags'])
    expect(filterParamKeys('archived', boolean())).toEqual(['archived'])
  })

  it('gives a range filter both of its sides, in order', () => {
    expect(filterParamKeys('createdAt', dateRange())).toEqual(['createdAtFrom', 'createdAtTo'])
    expect(filterParamKeys('amount', numberRange())).toEqual(['amountMin', 'amountMax'])
  })

  it('reports the override instead of the derived key', () => {
    expect(
      filterParamKeys(
        'createdAt',
        dateRange({ keys: { from: 'created_after', to: 'created_before' } })
      )
    ).toEqual(['created_after', 'created_before'])
    expect(filterParamKeys('amount', numberRange({ keys: { min: 'min_cents' } }))).toEqual([
      'min_cents',
      'amountMax',
    ])
  })

  /**
   * This module is the only place a filter name becomes a param key, so a kind
   * it does not recognise must not be answered with a guess. Falling back to
   * `[name]` would under-report the keys of a future range-shaped filter, and
   * `getFilterParamKeys` is what `createFilterUrl` strips before writing the new
   * state — an unreported key sits in the URL forever.
   *
   * The switch enumerates all six kinds, so TypeScript already refuses a new one
   * at compile time. This covers the runtime half: a schema built by hand, or
   * arriving across a JSON boundary, cannot silently get the wrong keys.
   */
  it('throws for a kind it does not know instead of guessing', () => {
    expect(() => filterParamKeys('page', { _kind: 'pageRange' } as unknown as AnyFilter)).toThrow(
      /unsupported filter kind "pageRange"/
    )
  })
})

describe('dateRangeParamKeys / numberRangeParamKeys', () => {
  it('derive from the filter name when no override is given', () => {
    expect(dateRangeParamKeys('createdAt', dateRange())).toEqual({
      from: 'createdAtFrom',
      to: 'createdAtTo',
    })
    expect(numberRangeParamKeys('amount', numberRange())).toEqual({
      min: 'amountMin',
      max: 'amountMax',
    })
  })

  it('accept one side of the override and derive the other', () => {
    expect(dateRangeParamKeys('createdAt', dateRange({ keys: { to: 'until' } }))).toEqual({
      from: 'createdAtFrom',
      to: 'until',
    })
    expect(numberRangeParamKeys('amount', numberRange({ keys: { max: 'ceiling' } }))).toEqual({
      min: 'amountMin',
      max: 'ceiling',
    })
  })
})

describe('the keys option is inert when unused', () => {
  it('an empty override produces a filter identical to no override', () => {
    expect(dateRange({ keys: {} })).toEqual(dateRange())
    expect(numberRange({ keys: {} })).toEqual(numberRange())
    expect(dateRange({})).toEqual(dateRange())
  })

  it('a schema with no override serializes exactly as it did before', () => {
    const schema = defineFilters({ createdAt: dateRange(), amount: numberRange() })
    const params = toSearchParams(schema, {
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
    expect(params.toString()).toBe(
      'createdAtFrom=2026-01-01&createdAtTo=2026-01-31&amountMin=100&amountMax=500'
    )
  })
})

describe('parse and serialize agree on a custom key', () => {
  const schema = defineFilters({
    createdAt: dateRange({ keys: { from: 'created_after', to: 'created_before' } }),
    amount: numberRange({ keys: { min: 'min_cents', max: 'max_cents' } }),
  })

  it('writes the custom keys', () => {
    const params = toSearchParams(schema, {
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
    expect(params.toString()).toBe(
      'created_after=2026-01-01&created_before=2026-01-31&min_cents=100&max_cents=500'
    )
  })

  it('reads the custom keys', () => {
    const state = parseFilters(schema, {
      created_after: '2026-01-01',
      created_before: '2026-01-31',
      min_cents: '100',
      max_cents: '500',
    })
    expect(state).toEqual({
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
  })

  it('ignores the keys the filter would have used without the override', () => {
    const state = parseFilters(schema, {
      createdAtFrom: '2026-01-01',
      amountMin: '100',
    })
    expect(state).toEqual({})
  })

  it('round-trips state through the URL', () => {
    const state = {
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    }
    expect(parseFilters(schema, toSearchParams(schema, state))).toEqual(state)
  })

  it('round-trips a partial override', () => {
    const partial = defineFilters({ createdAt: dateRange({ keys: { from: 'after' } }) })
    const params = toSearchParams(partial, { createdAt: { from: '2026-01-01', to: '2026-02-01' } })
    expect(params.toString()).toBe('after=2026-01-01&createdAtTo=2026-02-01')
    expect(parseFilters(partial, params)).toEqual({
      createdAt: { from: '2026-01-01', to: '2026-02-01' },
    })
  })

  it('round-trips a key that is not a prefix of the filter name at all', () => {
    const schema = defineFilters({ createdAt: dateRange({ keys: { from: 'q', to: 'z' } }) })
    const state = { createdAt: { from: '2026-01-01', to: '2026-01-31' } }
    expect(parseFilters(schema, toSearchParams(schema, state))).toEqual(state)
  })
})

/**
 * Decision 4 of the task: a custom key is a URL concern. The DTO is keyed by
 * filter name and nests ranges as `{ from, to }` regardless, and "I set `keys`
 * and my DTO did not change" is the support question this asserts an answer to.
 */
describe('toQueryDto is unaffected by keys', () => {
  it('produces the same DTO with and without an override', () => {
    const plain = defineFilters({ createdAt: dateRange(), amount: numberRange() })
    const custom = defineFilters({
      createdAt: dateRange({ keys: { from: 'created_after', to: 'created_before' } }),
      amount: numberRange({ keys: { min: 'min_cents', max: 'max_cents' } }),
    })
    const state = {
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    }

    expect(toQueryDto(custom, state)).toEqual(toQueryDto(plain, state))
    expect(toQueryDto(custom, state)).toEqual({
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
  })
})

describe('getFilterParamKeys reports overrides', () => {
  it('lists the custom keys in schema order', () => {
    const schema = defineFilters({
      search: text(),
      createdAt: dateRange({ keys: { from: 'created_after' } }),
      amount: numberRange({ keys: { min: 'min_cents', max: 'max_cents' } }),
    })
    expect(getFilterParamKeys(schema)).toEqual([
      'search',
      'created_after',
      'createdAtTo',
      'min_cents',
      'max_cents',
    ])
  })

  it('reports every key toSearchParams can write, for every schema', () => {
    const schema = defineFilters({
      search: text(),
      status: select(['paid'] as const),
      tags: multiSelect(['urgent'] as const),
      archived: boolean(),
      createdAt: dateRange({ keys: { to: 'until' } }),
      amount: numberRange({ keys: { min: 'floor' } }),
    })
    const params = toSearchParams(schema, {
      search: 'invoice',
      status: 'paid',
      tags: ['urgent'],
      archived: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 1, max: 2 },
    })

    const declared = getFilterParamKeys(schema)
    for (const key of params.keys()) {
      expect(declared, `toSearchParams wrote an undeclared key: ${key}`).toContain(key)
    }
  })
})

describe('defineFilters rejects colliding param keys', () => {
  it('throws when a custom key collides with a scalar filter', () => {
    expect(() =>
      defineFilters({
        createdAt: dateRange({ keys: { from: 'start' } }),
        start: text(),
      })
    ).toThrow(/both use the URL param "start"/)
  })

  // Possible in 0.2.0 with no custom key at all, where toSearchParams let the
  // last writer win and one of the two filters round-tripped to a value it
  // never held. This is the behavior change the changeset has to spell out.
  it('throws on the pre-existing collision that needed no override', () => {
    expect(() =>
      defineFilters({
        createdAtFrom: text(),
        createdAt: dateRange(),
      })
    ).toThrow(/both use the URL param "createdAtFrom"/)
  })

  /**
   * A range colliding with itself is not the same failure as two filters
   * fighting over one param, and the generic message gave advice that cannot be
   * followed: it named "createdAt" twice and suggested renaming one of them or
   * adding the keys override that is already there. Asserted in full — the
   * previous fragment match passed while the sentence was wrong.
   */
  it('throws when a range collides with itself, naming the two sides', () => {
    expect(() =>
      defineFilters({ createdAt: dateRange({ keys: { from: 'when', to: 'when' } }) })
    ).toThrow(
      new Error(
        '[filterbridge] defineFilters(): filter "createdAt" uses the URL param "when" for ' +
          'both sides of its range. Give keys.from and keys.to different names.'
      )
    )
  })

  it('names the sides a numberRange actually has', () => {
    expect(() =>
      defineFilters({ amount: numberRange({ keys: { min: 'cents', max: 'cents' } }) })
    ).toThrow(
      new Error(
        '[filterbridge] defineFilters(): filter "amount" uses the URL param "cents" for both ' +
          'sides of its range. Give keys.min and keys.max different names.'
      )
    )
  })

  it('names both filters, so the message says what to rename', () => {
    expect(() => defineFilters({ amountMin: text(), amount: numberRange() })).toThrow(
      /"amountMin" and "amount"/
    )
  })

  it('accepts a schema whose override resolves the collision', () => {
    expect(() =>
      defineFilters({
        createdAtFrom: text(),
        createdAt: dateRange({ keys: { from: 'created_after' } }),
      })
    ).not.toThrow()
  })

  it('accepts every schema that worked before', () => {
    expect(() =>
      defineFilters({
        search: text(),
        status: select(['paid'] as const),
        tags: multiSelect(['urgent'] as const),
        archived: boolean(),
        createdAt: dateRange(),
        amount: numberRange(),
      })
    ).not.toThrow()
  })
})

describe('the builders reject an unusable key', () => {
  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('throws for %s', (_label, value) => {
    expect(() => dateRange({ keys: { from: value } })).toThrow(/keys\.from must be a non-empty/)
    expect(() => numberRange({ keys: { max: value } })).toThrow(/keys\.max must be a non-empty/)
  })

  /**
   * The entire reason to set `keys` is to match the param name a backend
   * expects. A padded key round-trips inside FilterBridge — parse and serialize
   * use the same string — so nothing here would have caught it, while the URL
   * reads `+created_after+=2026-01-01` and the backend matches nothing. This is
   * the one input the builder could accept and still be certain it does not do
   * what the caller meant.
   */
  it.each([
    ['a leading space', ' created_after'],
    ['a trailing space', 'created_after '],
    ['padding on both sides', '  created_after  '],
    ['a trailing newline', 'created_after\n'],
  ])('throws for %s', (_label, value) => {
    expect(() => dateRange({ keys: { from: value } })).toThrow(
      /keys\.from must not have leading or trailing whitespace/
    )
    expect(() => numberRange({ keys: { min: value } })).toThrow(
      /keys\.min must not have leading or trailing whitespace/
    )
  })

  /**
   * A side the builder does not have was the one bad input it accepted in
   * silence: `{ form: 'created_after' }` produced a filter with no override at
   * all, still reading `createdAtFrom`, and the mistake surfaced later as an
   * empty filter on a URL that looked correct. Every other malformed `keys`
   * here throws, and this is static configuration like the rest of it.
   *
   * TypeScript's excess property check catches the typo in an object literal,
   * but not behind a cast, not through a variable, and not for a JavaScript
   * caller.
   */
  it('throws for a side the builder does not have', () => {
    expect(() =>
      dateRange({ keys: { form: 'created_after' } as unknown as { from?: string } })
    ).toThrow(/dateRange\(\): keys has no side "form"\. Expected from, to\./)

    expect(() =>
      numberRange({ keys: { minimum: 'min_cents' } as unknown as { min?: string } })
    ).toThrow(/numberRange\(\): keys has no side "minimum"\. Expected min, max\./)
  })

  it('names the unknown side even when a valid one is present', () => {
    expect(() =>
      dateRange({
        keys: { from: 'created_after', untill: 'created_before' } as unknown as { from?: string },
      })
    ).toThrow(/keys has no side "untill"/)
  })

  it('throws for a non-string, which only a JavaScript caller can reach', () => {
    expect(() => dateRange({ keys: { to: 42 as unknown as string } })).toThrow(
      /keys\.to must be a non-empty string, got 42/
    )
  })
})
