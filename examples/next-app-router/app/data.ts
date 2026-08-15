import type { InferFilterState } from '@filterbridge/core'
import type { invoiceFilters } from './filters'

export type Invoice = {
  id: string
  customer: string
  status: 'pending' | 'paid' | 'failed'
  tags: Array<'urgent' | 'recurring' | 'overdue'>
  archived: boolean
  createdAt: string
}

const INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    customer: 'Acme',
    status: 'paid',
    tags: ['recurring'],
    archived: false,
    createdAt: '2026-01-04',
  },
  {
    id: 'INV-002',
    customer: 'Globex',
    status: 'pending',
    tags: ['urgent'],
    archived: false,
    createdAt: '2026-01-11',
  },
  {
    id: 'INV-003',
    customer: 'Initech',
    status: 'failed',
    tags: ['urgent', 'overdue'],
    archived: false,
    createdAt: '2026-01-18',
  },
  {
    id: 'INV-004',
    customer: 'Umbrella',
    status: 'pending',
    tags: [],
    archived: true,
    createdAt: '2026-02-02',
  },
  {
    id: 'INV-005',
    customer: 'Hooli',
    status: 'paid',
    tags: ['recurring'],
    archived: false,
    createdAt: '2026-02-14',
  },
  {
    id: 'INV-006',
    customer: 'Soylent',
    status: 'pending',
    tags: ['overdue'],
    archived: false,
    createdAt: '2026-03-01',
  },
]

/** What `toQueryDto(invoiceFilters, state)` returns. */
type Dto = InferFilterState<typeof invoiceFilters>

/**
 * Stands in for a real API call. It takes the DTO rather than the raw state on
 * purpose: `toQueryDto` is what a backend would receive, so filtering against
 * it is the closest a fixture gets to exercising the real boundary.
 */
export async function fetchInvoices(dto: Dto): Promise<Invoice[]> {
  await new Promise((resolve) => setTimeout(resolve, 50))

  return INVOICES.filter((invoice) => {
    if (dto.search && !invoice.customer.toLowerCase().includes(dto.search.toLowerCase())) {
      return false
    }
    if (dto.status && invoice.status !== dto.status) return false
    if (dto.tags?.length && !dto.tags.some((tag) => invoice.tags.includes(tag))) return false
    if (dto.archived !== undefined && invoice.archived !== dto.archived) return false
    if (dto.createdAt?.from && invoice.createdAt < dto.createdAt.from) return false
    if (dto.createdAt?.to && invoice.createdAt > dto.createdAt.to) return false
    return true
  })
}
