// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { boolean, defineFilters, select, text } from '@filterbridge/core'
import { pushUrlFilters, replaceUrlFilters } from '../sync-url'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  archived: boolean(),
})

function makeMockHistory() {
  return {
    replaceState: vi.fn(),
    pushState: vi.fn(),
  }
}

describe('replaceUrlFilters', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/invoices', search: '', href: 'http://localhost/invoices' },
      writable: true,
      configurable: true,
    })
  })

  it('calls replaceState with the expected URL', () => {
    const history = makeMockHistory()
    replaceUrlFilters(schema, { search: 'acme' }, { history, pathname: '/invoices' })
    expect(history.replaceState).toHaveBeenCalledOnce()
    const [, , url] = history.replaceState.mock.calls[0]
    expect(url).toContain('search=acme')
    expect(url).toContain('/invoices')
  })

  it('does not call pushState', () => {
    const history = makeMockHistory()
    replaceUrlFilters(schema, { search: 'acme' }, { history, pathname: '/invoices' })
    expect(history.pushState).not.toHaveBeenCalled()
  })

  it('preserves non-filter params from currentSearch by default', () => {
    const history = makeMockHistory()
    replaceUrlFilters(
      schema,
      { search: 'acme' },
      { history, pathname: '/invoices', currentSearch: '?page=2&tab=open' }
    )
    const [, , url] = history.replaceState.mock.calls[0]
    expect(url).toContain('page=2')
    expect(url).toContain('search=acme')
  })

  it('removes old filter params from URL', () => {
    const history = makeMockHistory()
    replaceUrlFilters(
      schema,
      { search: 'new' },
      { history, pathname: '/invoices', currentSearch: '?page=2&search=old&status=paid' }
    )
    const [, , url] = history.replaceState.mock.calls[0]
    expect(url).not.toContain('search=old')
    expect(url).toContain('search=new')
    expect(url).toContain('page=2')
  })

  it('passes empty string as title by default', () => {
    const history = makeMockHistory()
    replaceUrlFilters(schema, {}, { history, pathname: '/invoices' })
    const [, title] = history.replaceState.mock.calls[0]
    expect(title).toBe('')
  })

  it('does not throw when no window and no history provided', () => {
    // window exists in jsdom, but history option is absent and we can check no-op behavior
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => replaceUrlFilters(schema, {}, { pathname: '/' })).not.toThrow()
    consoleSpy.mockRestore()
  })

  it('uses provided history object instead of window.history', () => {
    const history = makeMockHistory()
    replaceUrlFilters(schema, { status: 'paid' }, { history, pathname: '/invoices' })
    expect(history.replaceState).toHaveBeenCalledOnce()
  })
})

describe('pushUrlFilters', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/invoices', search: '', href: 'http://localhost/invoices' },
      writable: true,
      configurable: true,
    })
  })

  it('calls pushState with the expected URL', () => {
    const history = makeMockHistory()
    pushUrlFilters(schema, { search: 'acme' }, { history, pathname: '/invoices' })
    expect(history.pushState).toHaveBeenCalledOnce()
    const [, , url] = history.pushState.mock.calls[0]
    expect(url).toContain('search=acme')
    expect(url).toContain('/invoices')
  })

  it('does not call replaceState', () => {
    const history = makeMockHistory()
    pushUrlFilters(schema, { search: 'acme' }, { history, pathname: '/invoices' })
    expect(history.replaceState).not.toHaveBeenCalled()
  })

  it('preserves non-filter params from currentSearch by default', () => {
    const history = makeMockHistory()
    pushUrlFilters(
      schema,
      { search: 'acme' },
      { history, pathname: '/invoices', currentSearch: '?page=5' }
    )
    const [, , url] = history.pushState.mock.calls[0]
    expect(url).toContain('page=5')
    expect(url).toContain('search=acme')
  })

  it('removes old filter params', () => {
    const history = makeMockHistory()
    pushUrlFilters(
      schema,
      {},
      { history, pathname: '/invoices', currentSearch: '?page=1&search=old' }
    )
    const [, , url] = history.pushState.mock.calls[0]
    expect(url).not.toContain('search=old')
    expect(url).toContain('page=1')
  })

  it('passes empty string as title by default', () => {
    const history = makeMockHistory()
    pushUrlFilters(schema, {}, { history, pathname: '/invoices' })
    const [, title] = history.pushState.mock.calls[0]
    expect(title).toBe('')
  })
})
