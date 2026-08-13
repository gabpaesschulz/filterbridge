// This file deliberately carries no `@vitest-environment` docblock. It takes
// `environment: 'jsdom'` from `packages/browser/vitest.config.ts`, which is the
// same config that aliases `@filterbridge/react` to source — and if the root
// workspace ever stops applying per-project config, this file must fail loudly
// ("document is not defined") rather than quietly re-run against a stale
// `packages/react/dist`, where a broken invariant would still look green.
//
// End-to-end guard for the shape this feature could easily get wrong: the hook
// writes state to the URL in onChange, and usePopstateSync writes the URL back
// into the hook. If syncState fired onChange, these two would feed each other.
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { boolean, defineFilters, select, text } from '@filterbridge/core'
import { useFilterBridge } from '@filterbridge/react'
import { usePopstateSync } from '../react'
import { parseFiltersFromUrl } from '../parse-filters-from-url'
import { pushUrlFilters } from '../sync-url'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  archived: boolean(),
})

/** Minimal history stack: enough to drive back/forward against a fake location. */
function makeHistory() {
  const entries: string[] = ['/invoices']
  let index = 0

  const applyLocation = () => {
    const [pathname, search] = entries[index].split('?')
    Object.defineProperty(window, 'location', {
      value: {
        pathname,
        search: search ? `?${search}` : '',
        href: `http://localhost${entries[index]}`,
      },
      writable: true,
      configurable: true,
    })
  }

  applyLocation()

  return {
    pushState: (_state: unknown, _title: string, url: string) => {
      entries.splice(index + 1)
      entries.push(url)
      index = entries.length - 1
      applyLocation()
    },
    replaceState: (_state: unknown, _title: string, url: string) => {
      entries[index] = url
      applyLocation()
    },
    back: () => {
      if (index === 0) return
      index -= 1
      applyLocation()
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
    },
    forward: () => {
      if (index === entries.length - 1) return
      index += 1
      applyLocation()
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'))
      })
    },
    get entries() {
      return [...entries]
    },
  }
}

describe('popstate round trip', () => {
  let history: ReturnType<typeof makeHistory>
  let onChange: ReturnType<typeof vi.fn>

  function renderPage() {
    return renderHook(() => {
      const bridge = useFilterBridge(schema, {
        initialState: parseFiltersFromUrl(schema),
        onChange(state) {
          onChange(state)
          pushUrlFilters(schema, state, { history, pathname: '/invoices' })
        },
      })
      usePopstateSync(schema, bridge.syncState)
      return bridge
    })
  }

  beforeEach(() => {
    history = makeHistory()
    onChange = vi.fn()
  })

  it('restores the previous filter state on back', () => {
    const { result } = renderPage()

    act(() => result.current.set('search', 'acme'))
    act(() => result.current.set('status', 'paid'))
    expect(result.current.state).toEqual({ search: 'acme', status: 'paid' })

    history.back()

    expect(result.current.state).toEqual({ search: 'acme' })
  })

  it('walks all the way back to empty filters', () => {
    const { result } = renderPage()

    act(() => result.current.set('search', 'acme'))
    act(() => result.current.set('status', 'paid'))

    history.back()
    history.back()

    expect(result.current.state).toEqual({})
  })

  it('restores state again on forward', () => {
    const { result } = renderPage()

    act(() => result.current.set('search', 'acme'))
    act(() => result.current.set('archived', true))

    history.back()
    expect(result.current.state).toEqual({ search: 'acme' })

    history.forward()
    expect(result.current.state).toEqual({ search: 'acme', archived: true })
  })

  it('does not fire onChange while adopting state from history', () => {
    const { result } = renderPage()

    act(() => result.current.set('search', 'acme'))
    act(() => result.current.set('status', 'paid'))
    expect(onChange).toHaveBeenCalledTimes(2)

    history.back()

    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('does not push new history entries while adopting state from history', () => {
    const { result } = renderPage()

    act(() => result.current.set('search', 'acme'))
    act(() => result.current.set('status', 'paid'))
    const before = history.entries

    history.back()
    history.back()

    expect(history.entries).toEqual(before)
  })

  it('keeps writing to the URL after a back navigation', () => {
    const { result } = renderPage()

    act(() => result.current.set('search', 'acme'))
    history.back()

    act(() => result.current.set('status', 'failed'))

    expect(result.current.state).toEqual({ status: 'failed' })
    expect(window.location.search).toContain('status=failed')
  })
})
