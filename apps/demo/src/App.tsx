import { parseFiltersFromUrl, pushUrlFilters } from '@filterbridge/browser'
import { usePopstateSync } from '@filterbridge/browser/react'
import { useFilterBridge } from '@filterbridge/react'
import { toTanStackColumnFilters } from '@filterbridge/tanstack'
import { invoiceFilters, exampleState } from './filters'
import { INVOICES } from './data/invoices'
import { FilterCard } from './components/FilterCard'
import { OutputPanel } from './components/OutputPanel'
import { ActiveFiltersSummary } from './components/ActiveFiltersSummary'
import { InvoiceTable } from './components/InvoiceTable'

export function App() {
  const bridge = useFilterBridge(invoiceFilters, {
    initialState: parseFiltersFromUrl(invoiceFilters),
    onChange(state) {
      // pushState, not replaceState, so each filter change is its own history
      // entry and Back/Forward actually have somewhere to go.
      pushUrlFilters(invoiceFilters, state)
    },
  })

  // Adopt the URL when the user navigates through history. syncState does not
  // fire onChange, so this cannot push the entry we just navigated away from.
  usePopstateSync(invoiceFilters, bridge.syncState)

  const dto = bridge.toQueryDto()
  const searchParams = bridge.toSearchParams()
  const paramsString = searchParams.toString()
  const url = paramsString ? `/invoices?${paramsString}` : '/invoices'

  const columnFilters = toTanStackColumnFilters(invoiceFilters, bridge.state, {
    columnIds: { search: 'customerName' },
  })

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <h1 className="header-title">FilterBridge</h1>
            <span className="header-version">v{__FILTERBRIDGE_VERSION__}</span>
          </div>
          <p className="header-subtitle">Schema-first filters for React admin screens.</p>
          <p className="header-description">
            Declare filters once and reuse them as React state, backend DTOs, URLSearchParams and
            TanStack Table column filters.
          </p>
          <div className="url-sync-badge">
            <span className="url-sync-indicator" />
            URL sync enabled — change filters and watch the browser URL update. Reload the page, or
            use the browser's Back and Forward buttons, to restore filters from the URL.
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="main-layout">
          <section className="filters-column">
            <div className="column-header">
              <h2 className="column-title">Filters</h2>
              <ActiveFiltersSummary
                hasActiveFilters={bridge.hasActiveFilters}
                activeFilterCount={bridge.activeFilterCount}
              />
            </div>

            <FilterCard bridge={bridge} />

            <div className="filter-actions">
              <button className="btn btn-primary" onClick={() => bridge.setMany(exampleState)}>
                Fill example
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => bridge.reset()}
                disabled={!bridge.hasActiveFilters}
              >
                Reset filters
              </button>
            </div>
          </section>

          <section className="outputs-column">
            <div className="column-header">
              <h2 className="column-title">Generated outputs</h2>
              <span className="column-hint">Updates live as you change filters</span>
            </div>

            <OutputPanel title="React state" badge="bridge.state">
              <pre className="code-block">{JSON.stringify(bridge.state, null, 2)}</pre>
            </OutputPanel>

            <OutputPanel title="Backend DTO" badge="bridge.toQueryDto()">
              <p className="output-description">
                Empty values, empty arrays, and empty ranges are stripped — ready to send as request
                params.
              </p>
              <pre className="code-block">{JSON.stringify(dto, null, 2)}</pre>
            </OutputPanel>

            <OutputPanel title="URLSearchParams" badge="bridge.toSearchParams()">
              <p className="output-description">
                Deterministic URL serialization. Paste into any router or push to history.
              </p>
              <div className="url-display">
                <span className="url-path">{url}</span>
              </div>
              {paramsString && (
                <pre className="code-block">{paramsString.split('&').join('\n&')}</pre>
              )}
            </OutputPanel>

            <OutputPanel title="TanStack columnFilters" badge="toTanStackColumnFilters()">
              <p className="output-description">
                Ready to pass as <code>state.columnFilters</code> to <code>useReactTable</code>. The{' '}
                <code>search</code> filter is mapped to the <code>customerName</code> column.
              </p>
              <pre className="code-block">
                {columnFilters.length > 0 ? JSON.stringify(columnFilters, null, 2) : '[]'}
              </pre>
            </OutputPanel>
          </section>
        </div>

        <section className="table-section">
          <div className="column-header">
            <h2 className="column-title">Filtered invoices</h2>
            <span className="column-hint">
              Client-side filtering via <code>filterBridgeFilterFns</code>
            </span>
          </div>
          <InvoiceTable data={INVOICES} columnFilters={columnFilters} />
        </section>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>
            <a
              href="https://github.com/gabpaesschulz/filterbridge"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {' · '}
            <code>pnpm add @filterbridge/core @filterbridge/react</code>
          </p>
        </div>
      </footer>
    </div>
  )
}
