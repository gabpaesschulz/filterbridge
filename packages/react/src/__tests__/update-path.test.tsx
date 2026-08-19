// @vitest-environment jsdom
import { StrictMode, useState } from 'react'
import type { ReactNode } from 'react'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boolean, defineFilters, multiSelect, select, text } from '@filterbridge/core'
import { useFilterBridge } from '../index'

// Vitest runs without `globals: true`, so RTL never registers its own afterEach
// and rendered trees would otherwise pile up across the render() tests below.
afterEach(cleanup)

const schema = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const),
  tags: multiSelect(['urgent', 'review'] as const),
  active: boolean(),
})

const defaulted = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed'] as const, { default: 'paid' }),
})

/**
 * The contract around how a state update reaches React and how `onChange` is
 * told about it.
 *
 * Kept out of use-filter-bridge.test.tsx on purpose: those 80 tests describe
 * what the hook does, and this file describes *when* and *how many times*,
 * which is the property that was broken from 0.1.0 to 0.3.1 and the one no test
 * could see.
 */

// ---------------------------------------------------------------------------
// Batched updates
// ---------------------------------------------------------------------------

describe('two mutators in one handler', () => {
  // The gap this closes: every test in use-filter-bridge.test.tsx wraps a single
  // mutator in its own act(), so none of them compose two writes. That made the
  // closure-reading version of the render-phase fix — read `state` from the
  // render, drop the functional updater — pass the whole suite while losing the
  // first of two writes in one handler.
  it('keeps both writes when called from one act()', () => {
    const { result } = renderHook(() => useFilterBridge(schema))

    act(() => {
      result.current.set('search', 'invoice')
      result.current.set('status', 'paid')
    })

    expect(result.current.state).toEqual({ search: 'invoice', status: 'paid' })
  })

  it('keeps both writes when called from a real DOM event handler', () => {
    // The same property through the path a user actually takes. React batches
    // inside an event handler, so the second call must not read pre-batch state.
    function Subject() {
      const bridge = useFilterBridge(schema)
      return (
        <button
          onClick={() => {
            bridge.set('search', 'invoice')
            bridge.set('status', 'paid')
          }}
        >
          {JSON.stringify(bridge.state)}
        </button>
      )
    }

    render(<Subject />)
    act(() => {
      screen.getByRole('button').click()
    })

    expect(JSON.parse(screen.getByRole('button').textContent ?? '{}')).toEqual({
      search: 'invoice',
      status: 'paid',
    })
  })

  it('composes three writes across set, setMany and clear', () => {
    const { result } = renderHook(() => useFilterBridge(schema, { initialState: { active: true } }))

    act(() => {
      result.current.set('search', 'invoice')
      result.current.setMany({ status: 'paid', tags: ['urgent'] })
      result.current.clear('active')
    })

    expect(result.current.state).toEqual({
      search: 'invoice',
      status: 'paid',
      tags: ['urgent'],
    })
  })

  it('notifies once per mutator, not once per batch', () => {
    // setMany is the affordance for "one notification for several filters".
    // Two separate set() calls are two changes, and stay two notifications.
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilterBridge(schema, { onChange }))

    act(() => {
      result.current.set('search', 'invoice')
      result.current.set('status', 'paid')
    })

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenNthCalledWith(1, { search: 'invoice' })
    expect(onChange).toHaveBeenNthCalledWith(2, { search: 'invoice', status: 'paid' })
  })

  it('still layers the schema defaults over a batch', () => {
    const { result } = renderHook(() => useFilterBridge(defaulted))

    act(() => {
      result.current.set('search', 'acme')
      result.current.clear('status')
    })

    expect(result.current.state).toEqual({ search: 'acme', status: 'paid' })
  })
})

// ---------------------------------------------------------------------------
// onChange must not run during the render phase
// ---------------------------------------------------------------------------

describe('onChange does not run during the render phase', () => {
  let errors: string[]
  let spy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errors = []
    spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '))
    })
  })

  afterEach(() => {
    spy.mockRestore()
  })

  // The symptom that found this, reproduced without Next.js: an onChange that
  // updates another component's state. React warns when that happens from
  // inside a render, and `router.push` is exactly this shape — which is what
  // docs/guides/next-app-router.md tells people to write.
  //
  // It takes **two** clicks to see it, and that is worth knowing. React's eager
  // state path runs the updater in the event handler when the fiber has no
  // pending update, so the first change after mount is accidentally safe. Every
  // one after it runs during render. A single-click version of this test passes
  // against the broken implementation.
  function renderMirror() {
    function Parent() {
      const [mirrored, setMirrored] = useState('none')
      return (
        <>
          <output>{mirrored}</output>
          <Child onState={setMirrored} />
        </>
      )
    }

    function Child({ onState }: { onState: (value: string) => void }) {
      const bridge = useFilterBridge(schema, {
        onChange: (state) => onState(state.search ?? 'none'),
      })
      return (
        <button onClick={() => bridge.set('search', bridge.state.search === 'a' ? 'b' : 'a')}>
          set
        </button>
      )
    }

    render(<Parent />)
    return () => act(() => screen.getByRole('button').click())
  }

  it('lets onChange update another component without warning', () => {
    const click = renderMirror()

    click()
    click()

    expect(screen.getByRole('status').textContent).toBe('b')
    expect(errors.filter((message) => message.includes('Cannot update a component'))).toEqual([])
  })

  it('produces no React warning of any kind across repeated updates', () => {
    const { result } = renderHook(() => useFilterBridge(schema, { onChange: () => {} }))

    act(() => result.current.set('search', 'invoice'))
    act(() => result.current.set('search', 'acme'))
    act(() => result.current.set('status', 'paid'))

    expect(errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Strict Mode
// ---------------------------------------------------------------------------

function strict({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>
}

describe('under <React.StrictMode>', () => {
  // Strict Mode double-invokes the component body and state updaters in
  // development, precisely to surface impurity. A side effect in the updater
  // fires twice; one in an event handler fires once. "Exactly once per change"
  // is the property, and it is invisible outside Strict Mode.
  const mutators: Array<[string, (bridge: ReturnType<typeof useFilterBridge>) => void, unknown]> = [
    ['set', (b) => b.set('search', 'invoice'), { search: 'invoice' }],
    [
      'setMany',
      (b) => b.setMany({ search: 'invoice', status: 'paid' }),
      { search: 'invoice', status: 'paid' },
    ],
  ]

  it.each(mutators)('fires onChange exactly once for %s', (_label, run, expected) => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilterBridge(schema, { onChange }), { wrapper: strict })

    act(() => run(result.current))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(expected)
  })

  it('fires onChange exactly once for clear', () => {
    const onChange = vi.fn()
    const { result } = renderHook(
      () => useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange }),
      { wrapper: strict }
    )

    act(() => result.current.clear('search'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('fires onChange exactly once for reset', () => {
    const onChange = vi.fn()
    const { result } = renderHook(
      () => useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange }),
      { wrapper: strict }
    )

    act(() => result.current.reset())

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('fires onChange exactly once for resetToInitial', () => {
    const onChange = vi.fn()
    const { result } = renderHook(
      () => useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange }),
      { wrapper: strict }
    )

    act(() => result.current.reset())
    onChange.mockClear()
    act(() => result.current.resetToInitial())

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ search: 'invoice' })
  })

  it('does not fire onChange on mount', () => {
    const onChange = vi.fn()
    renderHook(() => useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange }), {
      wrapper: strict,
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  // ADR-004's invariant, under the mode that would expose a leak in it.
  it('does not fire onChange for syncState', () => {
    const onChange = vi.fn()
    const { result } = renderHook(
      () => useFilterBridge(schema, { initialState: { search: 'invoice' }, onChange }),
      { wrapper: strict }
    )

    act(() => result.current.syncState({ status: 'paid' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(result.current.state).toEqual({ status: 'paid' })
  })

  it('still fires onChange after a syncState', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilterBridge(schema, { onChange }), { wrapper: strict })

    act(() => result.current.syncState({ status: 'paid' }))
    act(() => result.current.set('search', 'acme'))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ status: 'paid', search: 'acme' })
  })

  it('keeps both writes when two mutators run in one handler', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFilterBridge(schema, { onChange }), { wrapper: strict })

    act(() => {
      result.current.set('search', 'invoice')
      result.current.set('status', 'paid')
    })

    expect(result.current.state).toEqual({ search: 'invoice', status: 'paid' })
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})
