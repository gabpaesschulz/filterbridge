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
import { createNextFilterHref } from '../create-next-filter-href'

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'recurring', 'overdue'] as const),
  archived: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('createNextFilterHref', () => {
  describe('basic href generation', () => {
    it('creates href with pathname and filter state', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'acme', status: 'paid' },
        { pathname: '/invoices' }
      )
      expect(href).toContain('/invoices?')
      expect(href).toContain('search=acme')
      expect(href).toContain('status=paid')
    })

    it('defaults pathname to / when not provided', () => {
      const href = createNextFilterHref(filters, { search: 'acme' })
      expect(href).toBe('/?search=acme')
    })

    it('omits ? when filter state is empty', () => {
      const href = createNextFilterHref(filters, {}, { pathname: '/invoices' })
      expect(href).toBe('/invoices')
    })

    it('serializes multiSelect as CSV', () => {
      const href = createNextFilterHref(
        filters,
        { tags: ['urgent', 'recurring'] },
        { pathname: '/invoices' }
      )
      expect(href).toContain('tags=urgent%2Crecurring')
    })

    it('serializes boolean as "true"/"false"', () => {
      const href = createNextFilterHref(filters, { archived: true }, { pathname: '/invoices' })
      expect(href).toContain('archived=true')
    })

    it('serializes dateRange with From/To suffixes', () => {
      const href = createNextFilterHref(
        filters,
        { createdAt: { from: '2026-01-01', to: '2026-01-31' } },
        { pathname: '/invoices' }
      )
      expect(href).toContain('createdAtFrom=2026-01-01')
      expect(href).toContain('createdAtTo=2026-01-31')
    })

    it('serializes numberRange with Min/Max suffixes', () => {
      const href = createNextFilterHref(
        filters,
        { amount: { min: 100, max: 500 } },
        { pathname: '/invoices' }
      )
      expect(href).toContain('amountMin=100')
      expect(href).toContain('amountMax=500')
    })
  })

  describe('preserving existing params', () => {
    it('preserves non-filter params by default', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        {
          pathname: '/invoices',
          searchParams: { tab: 'open', page: '2' },
        }
      )
      expect(href).toContain('tab=open')
      expect(href).toContain('page=2')
      expect(href).toContain('search=acme')
    })

    it('replaces old filter param values with new state', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'new', status: 'paid' },
        {
          pathname: '/invoices',
          searchParams: { search: 'old', status: 'failed' },
        }
      )
      expect(href).toContain('search=new')
      expect(href).toContain('status=paid')
      expect(href).not.toContain('search=old')
      expect(href).not.toContain('status=failed')
    })

    it('removes old filter params not present in new state', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        {
          pathname: '/invoices',
          searchParams: { search: 'old', status: 'paid', tab: 'open' },
        }
      )
      expect(href).toContain('search=acme')
      expect(href).toContain('tab=open')
      expect(href).not.toContain('status=paid')
      expect(href).not.toContain('search=old')
    })

    it('matches the spec example exactly', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        {
          pathname: '/invoices',
          searchParams: { tab: 'open', page: '2', search: 'old', status: 'paid' },
          preserveExistingParams: true,
        }
      )
      expect(href).toContain('/invoices?')
      expect(href).toContain('tab=open')
      expect(href).toContain('page=2')
      expect(href).toContain('search=acme')
      expect(href).not.toContain('status=paid')
      expect(href).not.toContain('search=old')
    })

    it('does not preserve non-filter params when preserveExistingParams is false', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        {
          pathname: '/invoices',
          searchParams: { tab: 'open', page: '2', search: 'old' },
          preserveExistingParams: false,
        }
      )
      expect(href).not.toContain('tab=open')
      expect(href).not.toContain('page=2')
      expect(href).toContain('search=acme')
    })
  })

  describe('hash support', () => {
    it('appends hash to href', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        { pathname: '/invoices', hash: 'section1' }
      )
      expect(href).toBe('/invoices?search=acme#section1')
    })

    it('appends hash even when no query params', () => {
      const href = createNextFilterHref(filters, {}, { pathname: '/invoices', hash: 'top' })
      expect(href).toBe('/invoices#top')
    })
  })

  describe('URLSearchParams as searchParams', () => {
    it('accepts URLSearchParams for existing params', () => {
      const sp = new URLSearchParams('tab=open&page=2')
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        { pathname: '/invoices', searchParams: sp }
      )
      expect(href).toContain('tab=open')
      expect(href).toContain('page=2')
      expect(href).toContain('search=acme')
    })

    it('removes old filter params from URLSearchParams', () => {
      const sp = new URLSearchParams('status=paid&tab=open')
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        { pathname: '/invoices', searchParams: sp }
      )
      expect(href).toContain('tab=open')
      expect(href).toContain('search=acme')
      expect(href).not.toContain('status=paid')
    })
  })

  describe('null/undefined searchParams', () => {
    it('works when searchParams is not provided', () => {
      const href = createNextFilterHref(filters, { search: 'acme' }, { pathname: '/invoices' })
      expect(href).toBe('/invoices?search=acme')
    })

    it('works when searchParams is null', () => {
      const href = createNextFilterHref(
        filters,
        { search: 'acme' },
        { pathname: '/invoices', searchParams: null }
      )
      expect(href).toBe('/invoices?search=acme')
    })
  })
})
