// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'

async function findAxeViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe.run(container, {
    resultTypes: ['violations'],
    // jsdom has no layout or canvas, so contrast cannot be measured here.
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help}\n    ${violation.nodes
        .map((node) => node.html)
        .join('\n    ')}`
  )
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  cleanup()
})

describe('demo accessibility', () => {
  it('has no axe violations on the initial render', async () => {
    const { container } = render(<App />)
    expect(await findAxeViolations(container)).toEqual([])
  })

  it('has no axe violations with every filter set', async () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /fill example/i }))
    expect(await findAxeViolations(container)).toEqual([])
  })

  it('gives every filter control an accessible name', () => {
    render(<App />)

    // Role queries compute the real accessible name, so these throw unless the
    // visible label is actually associated with the control.
    screen.getByRole('textbox', { name: 'Search' })
    screen.getByRole('combobox', { name: 'Status' })
    screen.getByRole('combobox', { name: 'Archived' })

    // Range sides are distinguishable from each other and carry the field name.
    // <input type="date"> has no implicit role, so it is matched by label.
    screen.getByLabelText('Issued at From')
    screen.getByLabelText('Issued at To')
    screen.getByRole('spinbutton', { name: 'Amount Min' })
    screen.getByRole('spinbutton', { name: 'Amount Max' })

    for (const tag of ['urgent', 'recurring', 'international', 'manual-review']) {
      screen.getByRole('checkbox', { name: tag })
    }
  })

  it('groups the multi-control fields so their name is announced', () => {
    render(<App />)

    expect(screen.getByRole('group', { name: 'Tags' })).toBeDefined()
    expect(screen.getByRole('group', { name: 'Issued At' })).toBeDefined()
    expect(screen.getByRole('group', { name: 'Amount' })).toBeDefined()
  })
})

describe('boolean filter', () => {
  function archivedSelect() {
    return screen.getByRole('combobox', { name: 'Archived' }) as HTMLSelectElement
  }

  it('starts unset and stays out of the URL', () => {
    render(<App />)

    expect(archivedSelect().value).toBe('')
    expect(window.location.search).not.toContain('archived')
  })

  it('can express false without being confused with unset', () => {
    render(<App />)

    fireEvent.change(archivedSelect(), { target: { value: 'false' } })

    expect(archivedSelect().value).toBe('false')
    expect(window.location.search).toContain('archived=false')
  })

  it('can return to unset through the UI', () => {
    render(<App />)

    fireEvent.change(archivedSelect(), { target: { value: 'true' } })
    expect(window.location.search).toContain('archived=true')

    fireEvent.change(archivedSelect(), { target: { value: '' } })

    expect(archivedSelect().value).toBe('')
    expect(window.location.search).not.toContain('archived')
  })

  it('is not counted as an active filter while unset', () => {
    render(<App />)

    expect(screen.getByText('No active filters')).toBeDefined()

    fireEvent.change(archivedSelect(), { target: { value: 'false' } })
    expect(screen.getByText('1 active filter')).toBeDefined()

    fireEvent.change(archivedSelect(), { target: { value: '' } })
    expect(screen.getByText('No active filters')).toBeDefined()
  })
})
