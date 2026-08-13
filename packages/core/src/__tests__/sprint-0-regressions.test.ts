import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boolean, dateRange, defineFilters, multiSelect, numberRange, select, text } from '../index'
import { parseFilters } from '../parse-filters'
import { toQueryDto } from '../query-dto'
import { toSearchParams } from '../search-params'

/**
 * One named test per defect found in Sprint 0, each using the exact
 * reproduction recorded in `docs/sprints/sprint-0/`.
 *
 * The property tests in `roundtrip.test.ts` cover the same ground more broadly
 * and would catch every one of these again. These exist so that a regression
 * names the bug it reintroduced instead of failing an opaque generated case.
 */

describe('task 1 — repeated query params are silently dropped', () => {
  const schema = defineFilters({ tags: multiSelect(['a', 'b'] as const) })

  it('keeps every value of a repeated param instead of the last one', () => {
    expect(parseFilters(schema, new URLSearchParams('tags=a&tags=b'))).toEqual({
      tags: ['a', 'b'],
    })
  })

  it('mixes repeated params with comma-separated values', () => {
    expect(parseFilters(schema, new URLSearchParams('tags=a,b&tags=a'))).toEqual({
      tags: ['a', 'b', 'a'],
    })
  })
})

describe('task 2 — NaN and Infinity leak into URL and DTO', () => {
  const schema = defineFilters({ amount: numberRange() })

  it('omits a NaN side from the URL and keeps the finite one', () => {
    expect(toSearchParams(schema, { amount: { min: NaN, max: 10 } }).toString()).toBe('amountMax=10')
  })

  it('never emits null in the DTO for a non-finite side', () => {
    expect(JSON.stringify(toQueryDto(schema, { amount: { min: NaN, max: 10 } }))).toBe(
      '{"amount":{"max":10}}'
    )
    expect(JSON.stringify(toQueryDto(schema, { amount: { min: -Infinity, max: Infinity } }))).toBe(
      '{}'
    )
  })

  it('does not let Infinity in through the parser either', () => {
    // Found by the round-trip property in task 10: `parseFloat('Infinity')` is
    // Infinity and the old `!isNaN` guard let it into state, where the
    // serializers dropped it again — so the state did not survive its own URL.
    expect(parseFilters(schema, new URLSearchParams('amountMin=Infinity&amountMax=1e999'))).toEqual(
      {}
    )
  })
})

describe('task 3 — serialization does not validate against the schema', () => {
  const schema = defineFilters({
    status: select(['paid', 'failed'] as const),
    tags: multiSelect(['a', 'b'] as const),
  })
  const state = { status: 'bogus', tags: ['zzz'] } as unknown as Parameters<
    typeof toSearchParams<typeof schema>
  >[1]

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps a value the schema forbids out of the URL', () => {
    expect(toSearchParams(schema, state).toString()).toBe('')
  })

  it('keeps a value the schema forbids out of the DTO', () => {
    expect(JSON.stringify(toQueryDto(schema, state))).toBe('{}')
  })

  it('makes the round-trip lossless for the same input', () => {
    expect(parseFilters(schema, toSearchParams(schema, state))).toEqual({})
  })

  it('warns once per dropped value in development', () => {
    toSearchParams(schema, state)
    expect(console.warn).toHaveBeenCalledTimes(2)
  })
})

describe('task 4 — empty and whitespace values leak into output', () => {
  const schema = defineFilters({ search: text(), createdAt: dateRange() })

  it('does not serialize a whitespace-only text value', () => {
    expect(toSearchParams(schema, { search: '   ' }).toString()).toBe('')
    expect(JSON.stringify(toQueryDto(schema, { search: '   ' }))).toBe('{}')
  })

  it('drops the empty side of a range instead of sending it as an empty string', () => {
    expect(JSON.stringify(toQueryDto(schema, { createdAt: { from: '', to: '2026-01-01' } }))).toBe(
      '{"createdAt":{"to":"2026-01-01"}}'
    )
  })

  it('gives a padded value and its trimmed twin the same URL', () => {
    expect(toSearchParams(schema, { search: '  invoice  ' }).toString()).toBe(
      toSearchParams(schema, { search: 'invoice' }).toString()
    )
  })
})

describe('task 10 — the two serializers agree on a boolean', () => {
  const schema = defineFilters({ active: boolean() })
  const state = { active: 'true' } as unknown as Parameters<typeof toQueryDto<typeof schema>>[1]

  it('drops a non-boolean from the DTO, as the URL already did', () => {
    // `toSearchParams` type-checked this and `toQueryDto` did not, so a state
    // arriving from JSON reached the backend as the string "true" while
    // disappearing from the URL entirely.
    expect(toSearchParams(schema, state).toString()).toBe('')
    expect(JSON.stringify(toQueryDto(schema, state))).toBe('{}')
  })
})
