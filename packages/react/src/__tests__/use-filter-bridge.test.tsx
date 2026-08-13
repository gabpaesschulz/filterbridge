// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  getDefaultFilterState,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
  toSearchParams,
} from '@filterbridge/core'
import type { InferFilterState } from '@filterbridge/core'
import { useFilterBridge } from '../index'

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review', 'archived'] as const),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('initialization', () => {
  it('starts with empty state when no initialState is provided', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    expect(result.current.state).toEqual({})
  })

  it('starts with the provided initialState', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: 'invoice', status: 'paid' },
      })
    )
    expect(result.current.state).toEqual({ search: 'invoice', status: 'paid' })
  })

  it('cleans empty values from initialState', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: '', status: 'paid', tags: [] },
      })
    )
    expect(result.current.state).toEqual({ status: 'paid' })
  })

  it('does not call onChange on the first render', () => {
    const onChange = vi.fn()
    renderHook(() => useFilterBridge(schema, { onChange }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// set()
// ---------------------------------------------------------------------------

describe('set()', () => {
  it('updates a text filter', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('search', 'invoice')
    })
    expect(result.current.state.search).toBe('invoice')
  })

  it('updates a select filter', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('status', 'paid')
    })
    expect(result.current.state.status).toBe('paid')
  })

  it('updates a multiSelect filter', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('tags', ['urgent', 'review'])
    })
    expect(result.current.state.tags).toEqual(['urgent', 'review'])
  })

  it('updates a boolean filter', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('active', true)
    })
    expect(result.current.state.active).toBe(true)
  })

  it('updates a dateRange filter', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('createdAt', { from: '2026-01-01', to: '2026-01-31' })
    })
    expect(result.current.state.createdAt).toEqual({ from: '2026-01-01', to: '2026-01-31' })
  })

  it('updates a numberRange filter', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('amount', { min: 100, max: 500 })
    })
    expect(result.current.state.amount).toEqual({ min: 100, max: 500 })
  })

  it('preserves other filters', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: 'invoice', status: 'paid' },
      })
    )
    act(() => {
      result.current.set('active', true)
    })
    expect(result.current.state.search).toBe('invoice')
    expect(result.current.state.status).toBe('paid')
    expect(result.current.state.active).toBe(true)
  })

  it('calls onChange with the new state', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilterBridge(schema, { onChange }))
    act(() => {
      result.current.set('search', 'invoice')
    })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({ search: 'invoice' })
  })

  it('removes an empty string', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.set('search', '')
    })
    expect(result.current.state.search).toBeUndefined()
    expect(Object.keys(result.current.state)).not.toContain('search')
  })

  it('removes an empty array', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { tags: ['urgent'] } })
    )
    act(() => {
      result.current.set('tags', [])
    })
    expect(result.current.state.tags).toBeUndefined()
  })

  it('removes an empty range object', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { amount: { min: 100 } } })
    )
    act(() => {
      result.current.set('amount', {})
    })
    expect(result.current.state.amount).toBeUndefined()
  })

  it('removes a range object where all values are undefined', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('createdAt', { from: undefined, to: undefined })
    })
    expect(result.current.state.createdAt).toBeUndefined()
  })

  it('removes a range object where every side is non-finite', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { amount: { min: 100 } } })
    )
    act(() => {
      result.current.set('amount', { min: NaN, max: Infinity })
    })
    expect(result.current.state.amount).toBeUndefined()
  })

  it('keeps a range object with one finite side and one NaN side', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('amount', { min: NaN, max: 500 })
    })
    expect(result.current.state.amount).toEqual({ min: NaN, max: 500 })
    expect(result.current.toQueryDto().amount).toEqual({ max: 500 })
    expect(result.current.toSearchParams().has('amountMin')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// setMany()
// ---------------------------------------------------------------------------

describe('setMany()', () => {
  it('updates multiple filters at once', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.setMany({ search: 'invoice', status: 'paid' })
    })
    expect(result.current.state.search).toBe('invoice')
    expect(result.current.state.status).toBe('paid')
  })

  it('preserves filters not included in the update', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { active: true } })
    )
    act(() => {
      result.current.setMany({ search: 'invoice' })
    })
    expect(result.current.state.active).toBe(true)
    expect(result.current.state.search).toBe('invoice')
  })

  it('calls onChange only once', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilterBridge(schema, { onChange }))
    act(() => {
      result.current.setMany({ search: 'invoice', status: 'paid' })
    })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({ search: 'invoice', status: 'paid' })
  })

  it('cleans empty values from the update', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice', status: 'paid' } })
    )
    act(() => {
      result.current.setMany({ search: '', status: undefined })
    })
    expect(result.current.state.search).toBeUndefined()
    expect(result.current.state.status).toBeUndefined()
    expect(result.current.state).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------

describe('clear()', () => {
  it('removes only the specified filter', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: 'invoice', status: 'paid' },
      })
    )
    act(() => {
      result.current.clear('status')
    })
    expect(result.current.state.status).toBeUndefined()
    expect(result.current.state.search).toBe('invoice')
  })

  it('preserves all other filters', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: 'invoice', status: 'paid', active: true },
      })
    )
    act(() => {
      result.current.clear('status')
    })
    expect(result.current.state.search).toBe('invoice')
    expect(result.current.state.active).toBe(true)
    expect(Object.keys(result.current.state)).toHaveLength(2)
  })

  it('calls onChange with the updated state', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange })
    )
    act(() => {
      result.current.clear('search')
    })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({})
  })
})

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe('reset()', () => {
  it('clears all filters to empty state', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: {
          search: 'invoice',
          status: 'paid',
          tags: ['urgent'],
          active: true,
        },
      })
    )
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toEqual({})
  })

  it('resets to empty state even if initialState was provided', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toEqual({})
  })

  it('calls onChange with empty state', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange })
    )
    act(() => {
      result.current.reset()
    })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('keeps a stable identity across renders', () => {
    const { result, rerender } = renderHook(() => useFilterBridge(schema))
    const first = result.current.reset
    rerender()
    expect(result.current.reset).toBe(first)
  })
})

// ---------------------------------------------------------------------------
// resetToInitial()
// ---------------------------------------------------------------------------

describe('resetToInitial()', () => {
  it('restores the initialState passed at mount', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: 'invoice', status: 'paid', tags: ['urgent'] },
      })
    )
    act(() => {
      result.current.setMany({ search: 'acme', status: 'failed' })
    })
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.state).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent'],
    })
  })

  it('removes filters that were not part of initialState', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.set('active', true)
    })
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.state).toEqual({ search: 'invoice' })
  })

  it('clears everything when no initialState was provided', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('search', 'invoice')
    })
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.state).toEqual({})
  })

  it('restores the cleaned initialState, not the raw one', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: '  ', status: 'paid', tags: [], amount: {} },
      })
    )
    act(() => {
      result.current.set('active', true)
    })
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.state).toEqual({ status: 'paid' })
  })

  it('calls onChange with the restored state', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange })
    )
    act(() => {
      result.current.set('status', 'paid')
    })
    onChange.mockClear()
    act(() => {
      result.current.resetToInitial()
    })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({ search: 'invoice' })
  })

  // The hook is uncontrolled: initialState is read once at mount, so a parent
  // passing a new one later must not silently change what "initial" means.
  it('ignores later changes to options.initialState', () => {
    const { result, rerender } = renderHook(
      ({ initialState }) => useFilterBridge(schema, { initialState }),
      { initialProps: { initialState: { search: 'invoice' } } }
    )
    rerender({ initialState: { search: 'acme' } })
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.state).toEqual({ search: 'invoice' })
  })

  it('can be called repeatedly with the same result', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.resetToInitial()
    })
    act(() => {
      result.current.set('status', 'paid')
    })
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.state).toEqual({ search: 'invoice' })
  })

  it('restores initialState even after syncState replaced the whole state', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.syncState({ status: 'failed' })
    })
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.state).toEqual({ search: 'invoice' })
  })

  it('updates derived state', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.reset()
    })
    expect(result.current.hasActiveFilters).toBe(false)
    act(() => {
      result.current.resetToInitial()
    })
    expect(result.current.activeFilterCount).toBe(1)
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('keeps a stable identity across renders', () => {
    const { result, rerender } = renderHook(() => useFilterBridge(schema))
    const first = result.current.resetToInitial
    rerender()
    expect(result.current.resetToInitial).toBe(first)
  })
})

// ---------------------------------------------------------------------------
// syncState()
// ---------------------------------------------------------------------------

describe('syncState()', () => {
  it('replaces the whole state with the provided one', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice', status: 'paid' } })
    )
    act(() => {
      result.current.syncState({ tags: ['urgent'] })
    })
    expect(result.current.state).toEqual({ tags: ['urgent'] })
  })

  it('does not merge with the current state', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.syncState({ status: 'failed' })
    })
    expect(result.current.state.search).toBeUndefined()
  })

  it('clears everything when given an empty object', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice', active: true } })
    )
    act(() => {
      result.current.syncState({})
    })
    expect(result.current.state).toEqual({})
  })

  // This is the invariant that keeps a popstate handler from looping: the
  // usual onChange writes state back to the URL, and syncState is called
  // *because* the URL already changed.
  it('does not call onChange', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange })
    )
    act(() => {
      result.current.syncState({ status: 'paid' })
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(result.current.state).toEqual({ status: 'paid' })
  })

  it('does not call onChange even when the synced state is empty', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange })
    )
    act(() => {
      result.current.syncState({})
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('still fires onChange for subsequent set() calls', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilterBridge(schema, { onChange }))
    act(() => {
      result.current.syncState({ status: 'paid' })
    })
    act(() => {
      result.current.set('search', 'acme')
    })
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({ status: 'paid', search: 'acme' })
  })

  it('cleans empty values from the synced state', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.syncState({ search: '   ', tags: [], status: 'paid', amount: {} })
    })
    expect(result.current.state).toEqual({ status: 'paid' })
  })

  it('updates derived state', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    act(() => {
      result.current.syncState({ status: 'paid', tags: ['urgent'] })
    })
    expect(result.current.activeFilterCount).toBe(2)
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('keeps a stable identity across renders', () => {
    const { result, rerender } = renderHook(() => useFilterBridge(schema))
    const first = result.current.syncState
    rerender()
    expect(result.current.syncState).toBe(first)
  })
})

// ---------------------------------------------------------------------------
// Derived state: hasActiveFilters, activeFilterCount
// ---------------------------------------------------------------------------

describe('derived state', () => {
  it('hasActiveFilters is false with empty state', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('hasActiveFilters is true when at least one filter is active', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('hasActiveFilters updates after set()', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    expect(result.current.hasActiveFilters).toBe(false)
    act(() => {
      result.current.set('search', 'invoice')
    })
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('hasActiveFilters updates after reset()', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, { initialState: { search: 'invoice' } })
    )
    expect(result.current.hasActiveFilters).toBe(true)
    act(() => {
      result.current.reset()
    })
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('activeFilterCount counts simple filters correctly', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: {
          search: 'invoice',
          status: 'paid',
          tags: ['urgent', 'review'],
        },
      })
    )
    expect(result.current.activeFilterCount).toBe(3)
  })

  it('activeFilterCount counts a dateRange as 1', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { createdAt: { from: '2026-01-01', to: '2026-01-31' } },
      })
    )
    expect(result.current.activeFilterCount).toBe(1)
  })

  it('activeFilterCount counts a numberRange as 1', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { amount: { min: 100, max: 500 } },
      })
    )
    expect(result.current.activeFilterCount).toBe(1)
  })

  it('empty values do not count as active filters', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('search', '')
      result.current.set('tags', [])
    })
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('activeFilterCount is 0 after reset()', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: 'invoice', status: 'paid' },
      })
    )
    act(() => {
      result.current.reset()
    })
    expect(result.current.activeFilterCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Derived state against a schema with defaults
// ---------------------------------------------------------------------------

const defaulted = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const, { default: 'paid' }),
  tags: multiSelect(['urgent', 'review', 'archived'] as const, { default: ['urgent'] }),
  active: boolean({ default: false }),
  createdAt: dateRange(),
  amount: numberRange(),
})

describe('activeFilterCount with schema defaults', () => {
  it('does not count a filter sitting at its default', () => {
    // The state a page opens with when nobody has touched anything: no query
    // string, nothing to reset. It must not read "6 active filters".
    const { result } = renderHook(() =>
      useFilterBridge(defaulted, { initialState: parseFilters(defaulted, {}) })
    )

    expect(result.current.state).toEqual(getDefaultFilterState(defaulted))
    expect(result.current.activeFilterCount).toBe(0)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('counts a filter the user moved off its default', () => {
    const { result } = renderHook(() =>
      useFilterBridge(defaulted, { initialState: parseFilters(defaulted, {}) })
    )

    act(() => result.current.set('status', 'failed'))

    expect(result.current.activeFilterCount).toBe(1)
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('agrees with the query string — count is the number of filters the URL carries', () => {
    // This is the invariant worth pinning: "active" and "appears in the URL"
    // are the same question, so the count cannot drift from what is serialized.
    const { result } = renderHook(() =>
      useFilterBridge(defaulted, { initialState: parseFilters(defaulted, {}) })
    )
    expect(result.current.toSearchParams().toString()).toBe('')

    act(() => result.current.setMany({ status: 'failed', search: 'acme' }))

    expect(result.current.activeFilterCount).toBe(2)
    expect(result.current.toSearchParams().toString()).toBe('search=acme&status=failed')
  })

  it('stops counting a filter that is set back to its default', () => {
    const { result } = renderHook(() =>
      useFilterBridge(defaulted, { initialState: parseFilters(defaulted, {}) })
    )

    act(() => result.current.set('active', true))
    expect(result.current.activeFilterCount).toBe(1)

    act(() => result.current.set('active', false))
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('counts a reordered multiSelect, which is a different state', () => {
    const { result } = renderHook(() => useFilterBridge(defaulted))

    act(() => result.current.set('tags', ['review', 'urgent']))

    expect(result.current.activeFilterCount).toBe(1)
  })

  it('leaves a schema without defaults counting exactly as before', () => {
    const { result } = renderHook(() => useFilterBridge(schema))

    act(() => result.current.setMany({ search: 'invoice', active: false }))

    expect(result.current.activeFilterCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Integration with @filterbridge/core
// ---------------------------------------------------------------------------

describe('core integration', () => {
  it('toQueryDto() returns a clean DTO reflecting current state', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: {
          search: 'invoice',
          status: 'paid',
          tags: ['urgent'],
        },
      })
    )
    expect(result.current.toQueryDto()).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent'],
    })
  })

  it('toQueryDto() omits empty values', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    expect(result.current.toQueryDto()).toEqual({})
  })

  it('toSearchParams() returns a URLSearchParams instance', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: { search: 'invoice', status: 'paid' },
      })
    )
    const params = result.current.toSearchParams()
    expect(params).toBeInstanceOf(URLSearchParams)
    expect(params.get('search')).toBe('invoice')
    expect(params.get('status')).toBe('paid')
  })

  it('toSearchParams() reflects the current state after set()', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => {
      result.current.set('search', 'invoice')
    })
    const params = result.current.toSearchParams()
    expect(params.get('search')).toBe('invoice')
  })

  it('roundtrip: toSearchParams() -> parseFilters() reproduces state', () => {
    const { result } = renderHook(() =>
      useFilterBridge(schema, {
        initialState: {
          search: 'invoice',
          status: 'paid',
          tags: ['urgent', 'review'],
          active: true,
          createdAt: { from: '2026-01-01', to: '2026-01-31' },
          amount: { min: 100, max: 500 },
        },
      })
    )
    const params = result.current.toSearchParams()
    const reparsed = parseFilters(schema, params)
    expect(reparsed).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent', 'review'],
      active: true,
      createdAt: { from: '2026-01-01', to: '2026-01-31' },
      amount: { min: 100, max: 500 },
    })
  })
})

// ---------------------------------------------------------------------------
// Type inference
// ---------------------------------------------------------------------------

describe('type inference', () => {
  it('infers correct types for state fields', () => {
    const typeSchema = defineFilters({
      search: text(),
      status: select(['pending', 'paid', 'failed'] as const),
      tags: multiSelect(['urgent', 'review'] as const),
      active: boolean(),
      createdAt: dateRange(),
      amount: numberRange(),
    })

    const { result } = renderHook(() => useFilterBridge(typeSchema))
    const { state } = result.current

    expectTypeOf(state.search).toEqualTypeOf<string | undefined>()
    expectTypeOf(state.status).toEqualTypeOf<'pending' | 'paid' | 'failed' | undefined>()
    expectTypeOf(state.tags).toEqualTypeOf<Array<'urgent' | 'review'> | undefined>()
    expectTypeOf(state.active).toEqualTypeOf<boolean | undefined>()
    expectTypeOf(state.createdAt).toEqualTypeOf<{ from?: string; to?: string } | undefined>()
    expectTypeOf(state.amount).toEqualTypeOf<{ min?: number; max?: number } | undefined>()
  })
})

// ---------------------------------------------------------------------------
// Hook state stays inside the range of parseFilters
// ---------------------------------------------------------------------------

/**
 * The invariant the defaults merge exists to hold: whatever the caller does,
 * there is always some URL that parses to `bridge.state`. Without it, `{}` is
 * reachable through reset/clear/syncState but is not a state any query string
 * can express — the UI would render a filter as cleared while the URL and the
 * DTO both read it as its default.
 */
function expectRepresentable(state: Record<string, unknown>, message: string) {
  expect(parseFilters(defaulted, toSearchParams(defaulted, state as never)), message).toEqual(state)
}

describe('state is always a state some URL parses to', () => {
  it('starts at the defaults even with no initialState', () => {
    const { result } = renderHook(() => useFilterBridge(defaulted))
    expect(result.current.state).toEqual(getDefaultFilterState(defaulted))
    expectRepresentable(result.current.state as Record<string, unknown>, 'mount')
  })

  it('reset() lands on the defaults, not on {}', () => {
    const { result } = renderHook(() => useFilterBridge(defaulted))
    act(() => result.current.setMany({ status: 'failed', search: 'acme' }))
    act(() => result.current.reset())

    expect(result.current.state).toEqual(getDefaultFilterState(defaulted))
    expectRepresentable(result.current.state as Record<string, unknown>, 'after reset')
  })

  it('clear() on a defaulted filter returns it to its default', () => {
    // "Absent" is not expressible for a filter with a default, so clear means
    // the only thing it can mean. It is durable now: a reload shows the same.
    const { result } = renderHook(() => useFilterBridge(defaulted))
    act(() => result.current.set('status', 'failed'))
    act(() => result.current.clear('status'))

    expect(result.current.state.status).toBe('paid')
    expectRepresentable(result.current.state as Record<string, unknown>, 'after clear')
  })

  it('clear() on a filter without a default still removes it', () => {
    const { result } = renderHook(() => useFilterBridge(defaulted))
    act(() => result.current.set('search', 'acme'))
    act(() => result.current.clear('search'))

    expect(result.current.state.search).toBeUndefined()
    expectRepresentable(result.current.state as Record<string, unknown>, 'after clear no-default')
  })

  it('syncState({}) adopts the defaults rather than an unreachable state', () => {
    const { result } = renderHook(() => useFilterBridge(defaulted))
    act(() => result.current.syncState({}))

    expect(result.current.state).toEqual(getDefaultFilterState(defaulted))
  })

  it('what the UI renders and what the backend is told never disagree', () => {
    // The mirror of the virgin-page defect, from the other side: after reset
    // the control must not read "no status" while the DTO says paid.
    const { result } = renderHook(() => useFilterBridge(defaulted))
    act(() => result.current.reset())

    expect(result.current.state.status).toBe('paid')
    expect(result.current.toQueryDto().status).toBe('paid')
  })

  it('leaves a schema without defaults resetting to {} exactly as before', () => {
    const { result } = renderHook(() => useFilterBridge(schema))
    act(() => result.current.setMany({ search: 'invoice', status: 'paid' }))
    act(() => result.current.reset())

    expect(result.current.state).toEqual({})
  })

  it('holds for 200 generated operation sequences', () => {
    const { result } = renderHook(() => useFilterBridge(defaulted))

    let seed = 0x51de >>> 0
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x100000000
    }

    const operations: Array<[string, () => void]> = [
      ['set status', () => result.current.set('status', 'failed')],
      ['set search', () => result.current.set('search', 'acme')],
      ['set tags', () => result.current.set('tags', ['review', 'urgent'])],
      ['set active', () => result.current.set('active', true)],
      ['set amount', () => result.current.set('amount', { min: 10 })],
      ['set empty search', () => result.current.set('search', '')],
      ['clear status', () => result.current.clear('status')],
      ['clear tags', () => result.current.clear('tags')],
      ['clear amount', () => result.current.clear('amount')],
      ['setMany', () => result.current.setMany({ status: 'pending', active: false })],
      ['reset', () => result.current.reset()],
      ['resetToInitial', () => result.current.resetToInitial()],
      ['syncState empty', () => result.current.syncState({})],
      ['syncState partial', () => result.current.syncState({ status: 'failed' })],
    ]

    const applied: string[] = []
    for (let i = 0; i < 200; i++) {
      const [label, run] = operations[Math.floor(random() * operations.length)]
      applied.push(label)
      act(run)
      expectRepresentable(
        result.current.state as Record<string, unknown>,
        `after: ${applied.slice(-6).join(' -> ')}`
      )
    }
  })
})

describe('resetToInitial() under the defaults rule', () => {
  it('captures the defaults-merged initialState at mount', () => {
    const { result } = renderHook(() =>
      useFilterBridge(defaulted, { initialState: { search: 'acme' } })
    )

    // initialState is layered over the defaults, so the captured value is
    // representable too — not the bare { search: 'acme' } that was passed in.
    expect(result.current.state).toEqual({ ...getDefaultFilterState(defaulted), search: 'acme' })

    act(() => result.current.setMany({ status: 'failed', search: 'other' }))
    act(() => result.current.resetToInitial())

    expect(result.current.state).toEqual({ ...getDefaultFilterState(defaulted), search: 'acme' })
    expectRepresentable(result.current.state as Record<string, unknown>, 'after resetToInitial')
  })

  it('restores the defaults for a key the initialState did not carry', () => {
    const { result } = renderHook(() =>
      useFilterBridge(defaulted, { initialState: { search: 'acme' } })
    )

    act(() => result.current.set('status', 'failed'))
    act(() => result.current.resetToInitial())

    expect(result.current.state.status).toBe('paid')
  })

  it('still ignores later changes to options.initialState', () => {
    type Initial = Partial<InferFilterState<typeof defaulted>>
    const { result, rerender } = renderHook(
      ({ initial }: { initial: Initial }) =>
        useFilterBridge(defaulted, { initialState: initial }),
      { initialProps: { initial: { search: 'acme' } as Initial } }
    )

    rerender({ initial: { search: 'changed' } as Initial })
    act(() => result.current.resetToInitial())

    expect(result.current.state.search).toBe('acme')
  })
})
