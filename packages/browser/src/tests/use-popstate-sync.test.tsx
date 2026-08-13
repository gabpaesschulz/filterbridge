// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { boolean, defineFilters, multiSelect, select, text } from '@filterbridge/core'
import { usePopstateSync } from '../react'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  archived: boolean(),
})

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { pathname: '/invoices', search, href: `http://localhost/invoices${search}` },
    writable: true,
    configurable: true,
  })
}

function firePopstate() {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

describe('usePopstateSync', () => {
  beforeEach(() => {
    setSearch('')
  })

  it('does not call onState on mount', () => {
    setSearch('?search=acme')
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState))
    expect(onState).not.toHaveBeenCalled()
  })

  it('calls onState with state parsed from the URL on popstate', () => {
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState))

    setSearch('?search=acme&status=paid')
    firePopstate()

    expect(onState).toHaveBeenCalledOnce()
    expect(onState).toHaveBeenCalledWith({ search: 'acme', status: 'paid' })
  })

  it('reads the URL at event time, not at subscribe time', () => {
    setSearch('?search=first')
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState))

    setSearch('?search=second')
    firePopstate()

    expect(onState).toHaveBeenCalledWith({ search: 'second' })
  })

  it('reports empty state when the URL has no filter params', () => {
    setSearch('?search=acme')
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState))

    setSearch('?page=2')
    firePopstate()

    expect(onState).toHaveBeenCalledWith({})
  })

  it('ignores params that are not in the schema', () => {
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState))

    setSearch('?search=acme&page=2&sort=desc')
    firePopstate()

    expect(onState).toHaveBeenCalledWith({ search: 'acme' })
  })

  it('handles every filter type in the schema', () => {
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState))

    setSearch('?search=acme&status=failed&tags=urgent,review&archived=true')
    firePopstate()

    expect(onState).toHaveBeenCalledWith({
      search: 'acme',
      status: 'failed',
      tags: ['urgent', 'review'],
      archived: true,
    })
  })

  it('fires on every popstate, not just the first', () => {
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState))

    setSearch('?search=a')
    firePopstate()
    setSearch('?search=b')
    firePopstate()

    expect(onState).toHaveBeenCalledTimes(2)
    expect(onState).toHaveBeenLastCalledWith({ search: 'b' })
  })

  it('removes the listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const onState = vi.fn()
    const { unmount } = renderHook(() => usePopstateSync(schema, onState))

    unmount()

    expect(removeSpy).toHaveBeenCalledWith('popstate', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('does not call onState after unmount', () => {
    const onState = vi.fn()
    const { unmount } = renderHook(() => usePopstateSync(schema, onState))

    unmount()
    setSearch('?search=acme')
    firePopstate()

    expect(onState).not.toHaveBeenCalled()
  })

  it('does not re-subscribe when the callback identity changes', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const { rerender } = renderHook(({ cb }: { cb: () => void }) => usePopstateSync(schema, cb), {
      initialProps: { cb: vi.fn() },
    })
    const initialCalls = addSpy.mock.calls.filter(([type]) => type === 'popstate').length

    rerender({ cb: vi.fn() })

    const afterCalls = addSpy.mock.calls.filter(([type]) => type === 'popstate').length
    expect(afterCalls).toBe(initialCalls)
    addSpy.mockRestore()
  })

  it('uses the latest callback after a rerender', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(
      ({ cb }: { cb: (state: unknown) => void }) => usePopstateSync(schema, cb),
      { initialProps: { cb: first as (state: unknown) => void } }
    )

    rerender({ cb: second as (state: unknown) => void })
    setSearch('?search=acme')
    firePopstate()

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith({ search: 'acme' })
  })

  it('does not attach a listener when disabled', () => {
    const onState = vi.fn()
    renderHook(() => usePopstateSync(schema, onState, { enabled: false }))

    setSearch('?search=acme')
    firePopstate()

    expect(onState).not.toHaveBeenCalled()
  })

  it('attaches the listener when enabled flips to true', () => {
    const onState = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePopstateSync(schema, onState, { enabled }),
      { initialProps: { enabled: false } }
    )

    rerender({ enabled: true })
    setSearch('?search=acme')
    firePopstate()

    expect(onState).toHaveBeenCalledWith({ search: 'acme' })
  })

  it('detaches the listener when enabled flips to false', () => {
    const onState = vi.fn()
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePopstateSync(schema, onState, { enabled }),
      { initialProps: { enabled: true } }
    )

    rerender({ enabled: false })
    setSearch('?search=acme')
    firePopstate()

    expect(onState).not.toHaveBeenCalled()
  })
})
