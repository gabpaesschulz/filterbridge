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
import { normalizeNextSearchParams } from '../normalize-next-search-params'

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'recurring', 'overdue'] as const),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('normalizeNextSearchParams', () => {
  describe('plain record input', () => {
    it('normalizes a simple record', () => {
      const result = normalizeNextSearchParams(filters, { search: 'acme', status: 'paid' })
      expect(result).toEqual({ search: 'acme', status: 'paid' })
    })

    it('ignores params outside the schema', () => {
      const result = normalizeNextSearchParams(filters, {
        search: 'acme',
        unknownParam: 'value',
        anotherUnknown: '123',
        tab: 'open',
      })
      expect(result).toEqual({ search: 'acme' })
      expect(result).not.toHaveProperty('unknownParam')
      expect(result).not.toHaveProperty('anotherUnknown')
      expect(result).not.toHaveProperty('tab')
    })

    it('takes first value for text filter with string array', () => {
      const result = normalizeNextSearchParams(filters, { search: ['acme', 'other'] })
      expect(result.search).toBe('acme')
    })

    it('takes first value for select filter with string array', () => {
      const result = normalizeNextSearchParams(filters, { status: ['paid', 'failed'] })
      expect(result.status).toBe('paid')
    })

    it('takes first value for boolean filter with string array', () => {
      const result = normalizeNextSearchParams(filters, { archived: ['true', 'false'] })
      expect(result.archived).toBe('true')
    })

    it('preserves array for multiSelect', () => {
      const result = normalizeNextSearchParams(filters, { tags: ['urgent', 'recurring'] })
      expect(result.tags).toEqual(['urgent', 'recurring'])
    })

    it('preserves string for multiSelect', () => {
      const result = normalizeNextSearchParams(filters, { tags: 'urgent' })
      expect(result.tags).toBe('urgent')
    })

    it('normalizes dateRange From/To keys', () => {
      const result = normalizeNextSearchParams(filters, {
        createdAtFrom: '2026-01-01',
        createdAtTo: '2026-01-31',
      })
      expect(result).toEqual({ createdAtFrom: '2026-01-01', createdAtTo: '2026-01-31' })
    })

    it('normalizes partial dateRange (from only)', () => {
      const result = normalizeNextSearchParams(filters, { createdAtFrom: '2026-01-01' })
      expect(result).toEqual({ createdAtFrom: '2026-01-01' })
      expect(result).not.toHaveProperty('createdAtTo')
    })

    it('normalizes numberRange Min/Max keys', () => {
      const result = normalizeNextSearchParams(filters, {
        amountMin: '100',
        amountMax: '500',
      })
      expect(result).toEqual({ amountMin: '100', amountMax: '500' })
    })

    it('normalizes partial numberRange (min only)', () => {
      const result = normalizeNextSearchParams(filters, { amountMin: '50' })
      expect(result).toEqual({ amountMin: '50' })
      expect(result).not.toHaveProperty('amountMax')
    })

    it('handles dateRange array values by taking first', () => {
      const result = normalizeNextSearchParams(filters, {
        createdAtFrom: ['2026-01-01', '2025-01-01'],
      })
      expect(result.createdAtFrom).toBe('2026-01-01')
    })
  })

  describe('URLSearchParams input', () => {
    it('accepts URLSearchParams', () => {
      const sp = new URLSearchParams('search=acme&status=paid')
      const result = normalizeNextSearchParams(filters, sp)
      expect(result).toEqual({ search: 'acme', status: 'paid' })
    })

    it('accepts URLSearchParams with repeated params for multiSelect', () => {
      const sp = new URLSearchParams()
      sp.append('tags', 'urgent')
      sp.append('tags', 'recurring')
      const result = normalizeNextSearchParams(filters, sp)
      expect(result.tags).toEqual(['urgent', 'recurring'])
    })

    it('ignores unknown keys from URLSearchParams', () => {
      const sp = new URLSearchParams('search=acme&page=2&tab=open')
      const result = normalizeNextSearchParams(filters, sp)
      expect(result).toEqual({ search: 'acme' })
      expect(result).not.toHaveProperty('page')
      expect(result).not.toHaveProperty('tab')
    })

    it('reads dateRange keys from URLSearchParams', () => {
      const sp = new URLSearchParams('createdAtFrom=2026-01-01&createdAtTo=2026-01-31')
      const result = normalizeNextSearchParams(filters, sp)
      expect(result).toEqual({ createdAtFrom: '2026-01-01', createdAtTo: '2026-01-31' })
    })
  })

  describe('ReadonlyURLSearchParams-like input', () => {
    it('accepts object with getAll + forEach', () => {
      const data: Record<string, string[]> = {
        search: ['acme'],
        status: ['paid'],
      }
      const mock = {
        getAll: (key: string) => data[key] ?? [],
        forEach: (fn: (v: string, k: string) => void) => {
          for (const [k, vals] of Object.entries(data)) {
            for (const v of vals) fn(v, k)
          }
        },
      }
      const result = normalizeNextSearchParams(filters, mock)
      expect(result).toEqual({ search: 'acme', status: 'paid' })
    })

    it('accepts object with entries() method', () => {
      const entries: [string, string][] = [
        ['search', 'acme'],
        ['status', 'paid'],
        ['tab', 'open'], // not in schema, should be ignored
      ]
      const mock = {
        entries: function* () {
          for (const pair of entries) yield pair as [string, string]
        },
      }
      const result = normalizeNextSearchParams(filters, mock)
      expect(result).toEqual({ search: 'acme', status: 'paid' })
    })

    it('accepts object with entries() and repeated multiSelect keys', () => {
      const mock = {
        entries: function* () {
          yield ['tags', 'urgent'] as [string, string]
          yield ['tags', 'recurring'] as [string, string]
        },
      }
      const result = normalizeNextSearchParams(filters, mock)
      expect(result.tags).toEqual(['urgent', 'recurring'])
    })
  })

  describe('null/undefined input', () => {
    it('returns {} for undefined input', () => {
      expect(normalizeNextSearchParams(filters, undefined)).toEqual({})
    })

    it('returns {} for null input', () => {
      expect(normalizeNextSearchParams(filters, null)).toEqual({})
    })

    it('returns {} when called with no searchParams argument', () => {
      expect(normalizeNextSearchParams(filters)).toEqual({})
    })
  })
})
