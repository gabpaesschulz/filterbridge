import { describe, expect, it } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  select,
  text,
} from '@filterbridge/core'
import { getFilterParamKeys } from '../filter-param-keys'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  archived: boolean(),
  issuedAt: dateRange(),
  amount: numberRange(),
})

describe('getFilterParamKeys', () => {
  it('returns simple keys for text, select, multiSelect, boolean', () => {
    const keys = getFilterParamKeys(
      defineFilters({ search: text(), status: select(['a'] as const), archived: boolean() })
    )
    expect(keys).toEqual(['search', 'status', 'archived'])
  })

  it('returns From/To keys for dateRange', () => {
    const keys = getFilterParamKeys(defineFilters({ issuedAt: dateRange() }))
    expect(keys).toEqual(['issuedAtFrom', 'issuedAtTo'])
  })

  it('returns Min/Max keys for numberRange', () => {
    const keys = getFilterParamKeys(defineFilters({ amount: numberRange() }))
    expect(keys).toEqual(['amountMin', 'amountMax'])
  })

  it('returns all keys in schema order', () => {
    const keys = getFilterParamKeys(schema)
    expect(keys).toEqual([
      'search',
      'status',
      'tags',
      'archived',
      'issuedAtFrom',
      'issuedAtTo',
      'amountMin',
      'amountMax',
    ])
  })

  it('returns deterministic order on repeated calls', () => {
    expect(getFilterParamKeys(schema)).toEqual(getFilterParamKeys(schema))
  })

  it('returns empty array for empty schema', () => {
    expect(getFilterParamKeys(defineFilters({}))).toEqual([])
  })
})
