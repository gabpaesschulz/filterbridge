import { toQueryDto } from '@filterbridge/core'
import { parseNextSearchParamsAsync } from '@filterbridge/next'
import { fetchInvoices } from './data'
import { invoiceFilters } from './filters'
import { InvoicesClient } from './invoices-client'

/**
 * Server component. No 'use client', no `window`, no hooks.
 *
 * In Next.js 15 `searchParams` is a Promise, which is why this uses
 * `parseNextSearchParamsAsync`. The sync `parseNextSearchParams` is for Next 14
 * and for the ReadonlyURLSearchParams a client component gets from
 * `useSearchParams()`.
 */
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const initialFilters = await parseNextSearchParamsAsync(invoiceFilters, searchParams)

  // The DTO, not the state, is what a backend receives. Note what this prints
  // on a bare `/` with no query string at all: `{ status: 'pending' }`. The URL
  // omits a value at its default; the DTO carries it, because the backend does
  // not know the schema and would otherwise return everything.
  const dto = toQueryDto(invoiceFilters, initialFilters)
  const invoices = await fetchInvoices(dto)

  return (
    <main>
      <h1>Invoices</h1>
      <p className="lede">
        Filters parsed on the server, edited on the client, and written back to the URL. Use the
        browser Back and Forward buttons — that is the case this example exists to check.
      </p>

      <InvoicesClient initialFilters={initialFilters} invoices={invoices} dto={dto} />
    </main>
  )
}
