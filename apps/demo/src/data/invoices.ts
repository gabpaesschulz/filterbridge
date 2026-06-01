export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled'
export type InvoiceTag = 'urgent' | 'recurring' | 'international' | 'manual-review'

export type Invoice = {
  id: string
  customerName: string
  status: InvoiceStatus
  tags: InvoiceTag[]
  archived: boolean
  issuedAt: string
  amount: number
}

export const INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    customerName: 'Acme Corp',
    status: 'paid',
    tags: ['recurring'],
    archived: false,
    issuedAt: '2026-01-05',
    amount: 1200,
  },
  {
    id: 'INV-002',
    customerName: 'Globex Industries',
    status: 'pending',
    tags: ['urgent', 'international'],
    archived: false,
    issuedAt: '2026-01-12',
    amount: 4800,
  },
  {
    id: 'INV-003',
    customerName: 'Initech LLC',
    status: 'failed',
    tags: ['manual-review'],
    archived: false,
    issuedAt: '2026-01-18',
    amount: 320,
  },
  {
    id: 'INV-004',
    customerName: 'Umbrella Corp',
    status: 'paid',
    tags: ['international', 'recurring'],
    archived: true,
    issuedAt: '2026-01-22',
    amount: 9500,
  },
  {
    id: 'INV-005',
    customerName: 'Hooli Inc',
    status: 'draft',
    tags: [],
    archived: false,
    issuedAt: '2026-02-01',
    amount: 750,
  },
  {
    id: 'INV-006',
    customerName: 'Acme Corp',
    status: 'pending',
    tags: ['urgent'],
    archived: false,
    issuedAt: '2026-02-07',
    amount: 2100,
  },
  {
    id: 'INV-007',
    customerName: 'Massive Dynamic',
    status: 'cancelled',
    tags: ['manual-review'],
    archived: true,
    issuedAt: '2026-02-14',
    amount: 5600,
  },
  {
    id: 'INV-008',
    customerName: 'Pied Piper',
    status: 'paid',
    tags: ['recurring'],
    archived: false,
    issuedAt: '2026-02-20',
    amount: 450,
  },
  {
    id: 'INV-009',
    customerName: 'Dunder Mifflin',
    status: 'paid',
    tags: ['recurring', 'international'],
    archived: false,
    issuedAt: '2026-03-03',
    amount: 870,
  },
  {
    id: 'INV-010',
    customerName: 'Initech LLC',
    status: 'pending',
    tags: ['urgent', 'manual-review'],
    archived: false,
    issuedAt: '2026-03-10',
    amount: 3300,
  },
]
