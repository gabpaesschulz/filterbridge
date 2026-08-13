// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  parseFilters,
  select,
  text,
} from '@filterbridge/core'
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
