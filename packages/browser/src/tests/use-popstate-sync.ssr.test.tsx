// @vitest-environment node
//
// No jsdom here on purpose: this file is the guard that `@filterbridge/browser`
// stays renderable on a server. It fails if the hook ever touches `window`
// during render instead of inside an effect.
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { defineFilters, select, text } from '@filterbridge/core'
import { usePopstateSync } from '../react'
import * as browser from '../index'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
})

describe('usePopstateSync without a DOM', () => {
  it('has no window to begin with', () => {
    expect(typeof window).toBe('undefined')
  })

  it('renders without throwing', () => {
    const onState = vi.fn()
    function Page() {
      usePopstateSync(schema, onState)
      return null
    }
    expect(() => renderToString(createElement(Page))).not.toThrow()
  })

  it('does not call onState during a server render', () => {
    const onState = vi.fn()
    function Page() {
      usePopstateSync(schema, onState)
      return null
    }
    renderToString(createElement(Page))
    expect(onState).not.toHaveBeenCalled()
  })
})

describe('root entry without a DOM', () => {
  it('does not export the React hook', () => {
    expect('usePopstateSync' in browser).toBe(false)
  })

  it('parses to empty state instead of throwing', () => {
    expect(browser.parseFiltersFromUrl(schema)).toEqual({})
  })

  it('still parses explicit input', () => {
    expect(browser.parseFiltersFromUrl(schema, '?search=acme')).toEqual({ search: 'acme' })
  })

  it('no-ops on replaceUrlFilters', () => {
    expect(() => browser.replaceUrlFilters(schema, { search: 'acme' })).not.toThrow()
  })
})
