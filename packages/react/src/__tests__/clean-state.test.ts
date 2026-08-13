import { describe, expect, it } from 'vitest'
import { cleanFilterState } from '../clean-state'

describe('cleanFilterState', () => {
  it('removes undefined and null values', () => {
    expect(cleanFilterState({ a: undefined, b: null, c: 'x' })).toEqual({ c: 'x' })
  })

  it('removes empty and whitespace-only strings', () => {
    expect(cleanFilterState({ search: '', other: '   ', kept: ' x ' })).toEqual({ kept: ' x ' })
  })

  it('removes empty arrays', () => {
    expect(cleanFilterState({ tags: [], kept: ['a'] })).toEqual({ kept: ['a'] })
  })

  it('removes non-finite numbers', () => {
    expect(cleanFilterState({ a: NaN, b: Infinity, c: 0 })).toEqual({ c: 0 })
  })

  it('removes a range whose sides are all nullish', () => {
    expect(cleanFilterState({ createdAt: { from: undefined, to: undefined } })).toEqual({})
  })

  it('removes a range whose sides are all empty strings', () => {
    expect(cleanFilterState({ createdAt: { from: '', to: '' } })).toEqual({})
  })

  it('removes a range mixing empty strings and nullish sides', () => {
    expect(cleanFilterState({ createdAt: { from: '', to: undefined } })).toEqual({})
  })

  it('removes a range whose sides are all whitespace', () => {
    expect(cleanFilterState({ createdAt: { from: '  ', to: ' ' } })).toEqual({})
  })

  it('keeps a range with one surviving side', () => {
    expect(cleanFilterState({ createdAt: { from: '', to: '2026-01-01' } })).toEqual({
      createdAt: { from: '', to: '2026-01-01' },
    })
  })

  it('keeps a numberRange whose only value is 0', () => {
    expect(cleanFilterState({ amount: { min: 0 } })).toEqual({ amount: { min: 0 } })
  })

  it('keeps boolean false', () => {
    expect(cleanFilterState({ active: false })).toEqual({ active: false })
  })

  it('removes an empty object', () => {
    expect(cleanFilterState({ createdAt: {} })).toEqual({})
  })
})
