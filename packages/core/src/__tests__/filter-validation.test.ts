import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineFilters, multiSelect, select, toQueryDto, toSearchParams } from '../index'
import { isValidOption, validOptions } from '../filter-validation'

const schema = defineFilters({
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review']),
})

type LooseState = Parameters<typeof toSearchParams<typeof schema>>[1]

/** Values reaching a serializer from JSON.parse / localStorage are not type-checked. */
function loose(state: Record<string, unknown>): LooseState {
  return state as LooseState
}

describe('isValidOption', () => {
  it('accepts a value present in options', () => {
    expect(isValidOption(schema.status, 'paid')).toBe(true)
  })

  it('rejects a value outside options', () => {
    expect(isValidOption(schema.status, 'bogus')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isValidOption(schema.status, 1)).toBe(false)
    expect(isValidOption(schema.status, null)).toBe(false)
    expect(isValidOption(schema.status, { toString: () => 'paid' })).toBe(false)
    expect(isValidOption(schema.status, ['paid'])).toBe(false)
  })
})

describe('validOptions', () => {
  it('keeps only valid entries and preserves their order', () => {
    expect(validOptions(schema.tags, ['review', 'zzz', 'urgent', 3])).toEqual(['review', 'urgent'])
  })

  it('returns an empty array when nothing is valid', () => {
    expect(validOptions(schema.tags, ['zzz'])).toEqual([])
  })
})

describe('dev warning on dropped values', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('warns once per invalid value in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    toSearchParams(schema, loose({ status: 'bogus', tags: ['zzz', 'urgent', 'nope'] }))

    expect(warn).toHaveBeenCalledTimes(3)
    expect(warn.mock.calls[0]?.[0]).toContain('[filterbridge] toSearchParams')
    expect(warn.mock.calls[0]?.[0]).toContain('"status"')
    expect(warn.mock.calls[0]?.[0]).toContain('pending, paid, failed')
  })

  it('names toQueryDto as the source when the DTO drops a value', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    toQueryDto(schema, loose({ status: 'bogus' }))

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('[filterbridge] toQueryDto')
  })

  it('stays silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    toSearchParams(schema, loose({ status: 'bogus', tags: ['zzz'] }))
    toQueryDto(schema, loose({ status: 'bogus', tags: ['zzz'] }))

    expect(warn).not.toHaveBeenCalled()
  })

  it('stays silent for valid state', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    toSearchParams(schema, { status: 'paid', tags: ['urgent'] })
    toQueryDto(schema, { status: 'paid', tags: ['urgent'] })

    expect(warn).not.toHaveBeenCalled()
  })

  it('never throws on invalid state', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(() => toSearchParams(schema, loose({ status: { nested: true }, tags: [null] }))).not.toThrow()
    expect(() => toQueryDto(schema, loose({ status: { nested: true }, tags: [null] }))).not.toThrow()
  })
})
