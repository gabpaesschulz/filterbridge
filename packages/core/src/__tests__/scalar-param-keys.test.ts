import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  getFilterParamKeys,
  multiSelect,
  numberRange,
  parseFilters,
  scalarParamKey,
  select,
  text,
  toQueryDto,
  toSearchParams,
} from '../index'
import type { InferFilterState } from '../index'

/**
 * `key` on the four filter kinds that occupy a single URL param.
 *
 * The range half of this landed in `0.3.1` as `keys`; the plural was chosen then
 * precisely so that `key` would be free now.
 */

const renamed = defineFilters({
  search: text({ key: 'q' }),
  status: select(['pending', 'paid', 'failed'] as const, { key: 'st' }),
  tags: multiSelect(['urgent', 'review'] as const, { key: 'labels' }),
  archived: boolean({ key: 'is_archived' }),
  createdAt: dateRange({ keys: { from: 'created_after', to: 'created_before' } }),
  amount: numberRange({ keys: { min: 'min_cents', max: 'max_cents' } }),
})

describe('scalarParamKey', () => {
  it('returns the filter name when no key is given', () => {
    expect(scalarParamKey('search', text())).toBe('search')
    expect(scalarParamKey('status', select(['paid'] as const))).toBe('status')
    expect(scalarParamKey('tags', multiSelect(['urgent'] as const))).toBe('tags')
    expect(scalarParamKey('archived', boolean())).toBe('archived')
  })

  it('returns the override when one is given', () => {
    expect(scalarParamKey('search', text({ key: 'q' }))).toBe('q')
    expect(scalarParamKey('status', select(['paid'] as const, { key: 'st' }))).toBe('st')
    expect(scalarParamKey('tags', multiSelect(['urgent'] as const, { key: 'l' }))).toBe('l')
    expect(scalarParamKey('archived', boolean({ key: 'a' }))).toBe('a')
  })
})

describe('the builders', () => {
  it('carry the key on the filter object', () => {
    expect(text({ key: 'q' })).toEqual({ _kind: 'text', key: 'q' })
    expect(boolean({ key: 'a', default: true })).toEqual({
      _kind: 'boolean',
      default: true,
      key: 'a',
    })
  })

  it('produce a filter indistinguishable from one built without the option', () => {
    // A schema written against 0.3.1 must still deep-equal its 0.4.0
    // counterpart, so an explicitly-undefined key cannot leave a trace.
    expect(text({ key: undefined })).toEqual(text())
    expect(select(['paid'] as const, { key: undefined })).toEqual(select(['paid'] as const))
    expect(boolean({ key: undefined })).toEqual(boolean())
    expect(multiSelect(['urgent'] as const, { key: undefined })).toEqual(
      multiSelect(['urgent'] as const)
    )
  })

  it('keep the default working alongside a key', () => {
    expect(select(['pending', 'paid'] as const, { default: 'paid', key: 'st' })).toEqual({
      _kind: 'select',
      options: ['pending', 'paid'],
      default: 'paid',
      key: 'st',
    })
  })

  it('reject a default that is not an option, key or no key', () => {
    expect(() => select(['pending'] as const, { default: 'paid' as 'pending', key: 'st' })).toThrow(
      /is not one of its options/
    )
  })

  it.each([['' as string], ['   ']])('reject an unusable key: %j', (value) => {
    expect(() => text({ key: value })).toThrow(/text\(\): key must be a non-empty string/)
    expect(() => boolean({ key: value })).toThrow(/boolean\(\): key must be a non-empty string/)
  })

  it.each([[' q'], ['q '], [' q ']])('reject a padded key: %j', (value) => {
    // Rejected rather than trimmed, for the reason the range keys are: the
    // point of the option is to match the param a backend expects, and ' q'
    // round-trips perfectly inside FilterBridge while the URL carries `+q+`.
    expect(() => text({ key: value })).toThrow(
      /text\(\): key must not have leading or trailing whitespace/
    )
  })

  it('rejects a non-string key', () => {
    expect(() => select(['paid'] as const, { key: 42 as unknown as string })).toThrow(
      /select\(\): key must be a non-empty string/
    )
  })

  it('still rejects a default on text at the type level', () => {
    // ADR-002 §4: `text` may not have a default, and the restriction is a type
    // error at the call site rather than a runtime check.
    // @ts-expect-error text() accepts a key, never a default
    text({ default: 'invoice' })
  })
})

describe('parseFilters', () => {
  it('reads every filter from its overridden key', () => {
    const state = parseFilters(renamed, {
      q: 'invoice',
      st: 'paid',
      labels: 'urgent,review',
      is_archived: 'true',
      created_after: '2026-01-01',
      created_before: '2026-01-31',
      min_cents: '100',
      max_cents: '500',
    })

    expect(state).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent', 'review'],
      archived: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
  })

  it('ignores the filter name once a key is set', () => {
    // The override replaces the param; it does not add an alias. A URL written
    // against the old name must not keep working silently, or the rename would
    // never be observable.
    expect(parseFilters(renamed, { search: 'invoice', status: 'paid' })).toEqual({})
  })

  it('reads repeated params from the overridden key', () => {
    const params = new URLSearchParams([
      ['labels', 'urgent'],
      ['labels', 'review'],
    ])
    expect(parseFilters(renamed, params).tags).toEqual(['urgent', 'review'])
  })

  it('applies a default under an overridden key', () => {
    const schema = defineFilters({
      status: select(['pending', 'paid'] as const, { default: 'paid', key: 'st' }),
    })
    expect(parseFilters(schema, {})).toEqual({ status: 'paid' })
    expect(parseFilters(schema, { st: 'nonsense' })).toEqual({ status: 'paid' })
  })
})

describe('toSearchParams', () => {
  it('writes every filter to its overridden key', () => {
    const params = toSearchParams(renamed, {
      search: 'invoice',
      status: 'paid',
      tags: ['urgent'],
      archived: false,
      createdAt: { from: '2026-01-01' },
      amount: { min: 100 },
    })

    expect(params.toString()).toBe(
      'q=invoice&st=paid&labels=urgent&is_archived=false&created_after=2026-01-01&min_cents=100'
    )
  })

  it('never writes the filter name', () => {
    const params = toSearchParams(renamed, { search: 'invoice', status: 'paid' })
    expect(params.has('search')).toBe(false)
    expect(params.has('status')).toBe(false)
  })

  it('omits a defaulted value under an overridden key', () => {
    const schema = defineFilters({
      status: select(['pending', 'paid'] as const, { default: 'paid', key: 'st' }),
    })
    expect(toSearchParams(schema, { status: 'paid' }).toString()).toBe('')
    expect(toSearchParams(schema, { status: 'pending' }).toString()).toBe('st=pending')
  })
})

describe('round trip', () => {
  it('parse -> serialize -> parse over a fully renamed schema', () => {
    const state = {
      search: 'invoice',
      status: 'paid',
      tags: ['urgent', 'review'],
      archived: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    } satisfies InferFilterState<typeof renamed>

    const once = parseFilters(renamed, toSearchParams(renamed, state))
    const twice = parseFilters(renamed, toSearchParams(renamed, once))

    expect(once).toEqual(state)
    expect(twice).toEqual(state)
  })
})

describe('getFilterParamKeys', () => {
  it('reports the overridden keys, in declaration order', () => {
    expect(getFilterParamKeys(renamed)).toEqual([
      'q',
      'st',
      'labels',
      'is_archived',
      'created_after',
      'created_before',
      'min_cents',
      'max_cents',
    ])
  })
})

describe('toQueryDto', () => {
  it('is unaffected — the DTO is keyed by filter name', () => {
    // A URL param key is a URL concern. The backend receives the schema's
    // field names, which is what makes the DTO readable next to the schema.
    const dto = toQueryDto(renamed, {
      search: 'invoice',
      status: 'paid',
      amount: { min: 100 },
    })

    expect(dto).toEqual({ search: 'invoice', status: 'paid', amount: { min: 100 } })
    expect(dto).not.toHaveProperty('q')
    expect(dto).not.toHaveProperty('st')
  })
})

describe('defineFilters collisions', () => {
  it('throws when a key collides with another filter name', () => {
    expect(() => defineFilters({ search: text({ key: 'q' }), q: text() })).toThrow(
      /both use the URL param "q"/
    )
  })

  it('throws when two keys collide with each other', () => {
    expect(() => defineFilters({ search: text({ key: 'q' }), title: text({ key: 'q' }) })).toThrow(
      /both use the URL param "q"/
    )
  })

  it('throws when a key collides with a range side', () => {
    expect(() =>
      defineFilters({ createdAt: dateRange(), from: text({ key: 'createdAtFrom' }) })
    ).toThrow(/both use the URL param "createdAtFrom"/)
  })

  it('allows a key that frees up the name for another filter', () => {
    // The point of the collision check is that renaming is a real escape hatch.
    expect(() =>
      defineFilters({ q: text({ key: 'query' }), search: text({ key: 'q' }) })
    ).not.toThrow()
  })
})

describe('type inference', () => {
  it('is unchanged by a key override', () => {
    // The state is keyed by filter name whatever the URL says.
    expectTypeOf<InferFilterState<typeof renamed>>().toMatchTypeOf<{
      search?: string
      status?: 'pending' | 'paid' | 'failed'
      tags?: Array<'urgent' | 'review'>
      archived?: boolean
    }>()
  })

  it('still infers the option union when a key is present', () => {
    const schema = defineFilters({ status: select(['pending', 'paid'] as const, { key: 'st' }) })
    expectTypeOf<InferFilterState<typeof schema>['status']>().toEqualTypeOf<
      'pending' | 'paid' | undefined
    >()
  })
})
