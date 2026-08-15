'use client'

import { usePopstateSync } from '@filterbridge/browser/react'
import type { InferFilterState } from '@filterbridge/core'
import { createNextFilterHref } from '@filterbridge/next'
import { useFilterBridge } from '@filterbridge/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Invoice } from './data'
import { invoiceFilters } from './filters'

type State = InferFilterState<typeof invoiceFilters>

type Props = {
  initialFilters: State
  invoices: Invoice[]
  dto: State
}

const TAGS = ['urgent', 'recurring', 'overdue'] as const

export function InvoicesClient({ initialFilters, invoices, dto }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const bridge = useFilterBridge(invoiceFilters, {
    initialState: initialFilters,
    onChange(nextState) {
      const href = createNextFilterHref(invoiceFilters, nextState, { pathname, searchParams })

      // `push`, not `replace`, and this is the whole reason back/forward has
      // anything to do. `router.replace` overwrites the current history entry,
      // so a page that only ever replaces has exactly one entry and pressing
      // Back leaves the application. `docs/guides/next-app-router.md` showed
      // `replace` while its "known limitations" talked about back/forward
      // working — those two statements cannot both be true.
      //
      // The cost is a history entry per change, including per keystroke in the
      // search box. A real app debounces the text input before calling `set`,
      // or uses `replace` for text and `push` for the discrete controls.
      //
      // The queueMicrotask is a workaround, not a pattern to copy for its own
      // sake. `useFilterBridge` fires `onChange` from inside its `setState`
      // updater, and React runs updaters during the render phase — so calling
      // `router.push` directly here logs "Cannot update a component (Router)
      // while rendering a different component". Deferring by a microtask moves
      // the navigation out of render. Tracked as Sprint 1 task 6; when the hook
      // fires `onChange` outside render, this wrapper can go.
      queueMicrotask(() => router.push(href, { scroll: false }))
    },
  })

  // Back and forward need this. The server component does re-run and does hand
  // down a fresh `initialFilters`, but `useFilterBridge` is uncontrolled by
  // design: it captures `initialState` on the first render and ignores it
  // afterwards, so that a parent re-render cannot stomp on what the user is
  // typing. React reconciles this component rather than remounting it, so
  // without a sync the URL and the table change while the filter inputs stay
  // where they were, and the two halves of the page disagree.
  //
  // `usePopstateSync` re-reads `window.location` on popstate and nothing else.
  // Two properties matter:
  //
  //   - it fires only on back/forward, not on every server response, so it
  //     cannot snap the search box back to a stale value mid-typing;
  //   - it is paired with `syncState`, which applies state WITHOUT firing
  //     `onChange`, so adopting the URL does not immediately write the URL
  //     again and fight the history stack.
  usePopstateSync(invoiceFilters, bridge.syncState)

  return (
    <>
      <fieldset>
        <legend>Filters</legend>

        <div className="row">
          <label>
            Search
            <input
              value={bridge.state.search ?? ''}
              onChange={(e) => bridge.set('search', e.target.value)}
              placeholder="customer name"
            />
          </label>

          <label>
            Status
            <select
              value={bridge.state.status ?? ''}
              onChange={(e) => bridge.set('status', e.target.value as State['status'])}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </label>

          <label>
            Archived
            <select
              value={bridge.state.archived === undefined ? '' : String(bridge.state.archived)}
              onChange={(e) =>
                bridge.set(
                  'archived',
                  e.target.value === '' ? undefined : e.target.value === 'true'
                )
              }
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>

        <div className="row">
          <label>
            Created from
            <input
              type="date"
              value={bridge.state.createdAt?.from ?? ''}
              onChange={(e) =>
                bridge.set('createdAt', { ...bridge.state.createdAt, from: e.target.value })
              }
            />
          </label>
          <label>
            Created to
            <input
              type="date"
              value={bridge.state.createdAt?.to ?? ''}
              onChange={(e) =>
                bridge.set('createdAt', { ...bridge.state.createdAt, to: e.target.value })
              }
            />
          </label>
        </div>

        <div className="checks">
          {TAGS.map((tag) => (
            <label key={tag}>
              <input
                type="checkbox"
                checked={bridge.state.tags?.includes(tag) ?? false}
                onChange={(e) => {
                  const current = bridge.state.tags ?? []
                  bridge.set(
                    'tags',
                    e.target.checked ? [...current, tag] : current.filter((t) => t !== tag)
                  )
                }}
              />
              {tag}
            </label>
          ))}
        </div>

        <div className="row">
          <button onClick={() => bridge.reset()}>Reset</button>
          <button onClick={() => bridge.resetToInitial()}>Back to initial</button>
          <span style={{ fontSize: '0.85rem', color: '#5b6270' }}>
            {bridge.activeFilterCount} active
          </span>
        </div>
      </fieldset>

      <h2 style={{ fontSize: '1rem' }}>Rows the server returned ({invoices.length})</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Tags</th>
            <th>Archived</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>{invoice.id}</td>
              <td>{invoice.customer}</td>
              <td>{invoice.status}</td>
              <td>{invoice.tags.join(', ') || '—'}</td>
              <td>{invoice.archived ? 'yes' : 'no'}</td>
              <td>{invoice.createdAt}</td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6}>No invoices match.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* The two outputs side by side, because the difference between them is
          the thing most easily got wrong. On a bare URL the query string is
          empty and the DTO still carries `status: 'pending'`. */}
      <h2 style={{ fontSize: '1rem' }}>Query string vs. DTO</h2>
      <pre>
        {JSON.stringify(
          {
            url: `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`,
            dtoTheServerUsed: dto,
            clientState: bridge.state,
          },
          null,
          2
        )}
      </pre>
    </>
  )
}
