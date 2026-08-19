// @vitest-environment jsdom
import { version as reactVersion } from 'react'
import { version as reactDomVersion } from 'react-dom'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defineFilters, text } from '@filterbridge/core'
import { useFilterBridge } from '../index'

/**
 * Guards the React 19 project's aliasing, which is the kind of setup that can
 * appear to work while being wrong.
 *
 * `packages/react` and `packages/browser` declare `react: >=18`. The suite runs
 * the same files twice, once per major, and both runs go through
 * `vitest.react-19.ts`'s aliases. If one of those aliases were missing — the
 * injected `react/jsx-runtime` is the easy one to forget — a second React would
 * load alongside the first, and the symptom would be a hook error that reads
 * like a bug in `useFilterBridge`.
 *
 * So the version each project runs is asserted, not assumed. `FILTERBRIDGE_REACT_MAJOR`
 * is set by the vitest config, so a project that silently stopped aliasing
 * fails here rather than passing 92 tests against the wrong React.
 */
describe('React version under test', () => {
  const expected = process.env.FILTERBRIDGE_REACT_MAJOR

  it('has a declared expected major', () => {
    // If this fails, a vitest project was added without saying which React it
    // runs, and every assertion below became vacuous.
    expect(expected, 'FILTERBRIDGE_REACT_MAJOR must be set by the vitest config').toMatch(/^\d+$/)
  })

  it('runs the React major the project claims', () => {
    expect(reactVersion.split('.')[0]).toBe(expected)
  })

  it('resolves React and React DOM to the same major', () => {
    // The two-Reacts failure: react-dom@19 loaded against react@18 installs a
    // dispatcher the other copy never reads.
    expect(reactDomVersion.split('.')[0]).toBe(reactVersion.split('.')[0])
  })

  it('renders a hook against that React', () => {
    // Cheapest possible proof that the aliased React is the one actually
    // driving the renderer — a mismatched pair throws here, not above.
    const schema = defineFilters({ search: text() })
    const { result } = renderHook(() => useFilterBridge(schema))
    expect(result.current.state).toEqual({})
  })
})
