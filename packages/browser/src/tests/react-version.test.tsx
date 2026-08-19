// @vitest-environment jsdom
import { version as reactVersion } from 'react'
import { version as reactDomVersion } from 'react-dom'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defineFilters, text } from '@filterbridge/core'
import { useFilterBridge } from '@filterbridge/react'
import { usePopstateSync } from '../react'

/**
 * The same guard as `packages/react/src/__tests__/react-version.test.tsx`, and
 * it has to be duplicated because each vitest project only includes its own
 * `src`.
 *
 * It earns its keep here for a reason that package does not have: this suite
 * imports `useFilterBridge` from `@filterbridge/react` **and** `usePopstateSync`
 * from its own source, so the two hooks reach React through different module
 * paths. If the aliasing were incomplete, this is the project where the two
 * copies would meet — and the popstate round-trip, which is ADR-004's
 * end-to-end guard, would start failing for a reason that has nothing to do
 * with ADR-004.
 */
describe('React version under test', () => {
  const expected = process.env.FILTERBRIDGE_REACT_MAJOR

  it('has a declared expected major', () => {
    expect(expected, 'FILTERBRIDGE_REACT_MAJOR must be set by the vitest config').toMatch(/^\d+$/)
  })

  it('runs the React major the project claims', () => {
    expect(reactVersion.split('.')[0]).toBe(expected)
  })

  it('resolves React and React DOM to the same major', () => {
    expect(reactDomVersion.split('.')[0]).toBe(reactVersion.split('.')[0])
  })

  it('reaches one React from both packages', () => {
    // Renders the pairing itself. Two Reacts throw here — "invalid hook call"
    // — rather than surfacing later as a broken sync invariant.
    const schema = defineFilters({ search: text() })
    const { result } = renderHook(() => {
      const bridge = useFilterBridge(schema)
      usePopstateSync(schema, bridge.syncState)
      return bridge
    })
    expect(result.current.state).toEqual({})
  })
})
