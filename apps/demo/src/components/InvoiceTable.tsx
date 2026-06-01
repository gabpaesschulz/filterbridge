import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table'
import { filterBridgeFilterFns } from '@filterbridge/tanstack'
import type { TanStackColumnFiltersState } from '@filterbridge/tanstack'
import type { Invoice } from '../data/invoices'

const columnHelper = createColumnHelper<Invoice>()

const columns = [
  columnHelper.accessor('customerName', {
    header: 'Customer',
    filterFn: 'text',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    filterFn: 'select',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('tags', {
    header: 'Tags',
    filterFn: 'multiSelect',
    cell: (info) => (
      <span>{info.getValue().length > 0 ? info.getValue().join(', ') : '—'}</span>
    ),
  }),
  columnHelper.accessor('archived', {
    header: 'Archived',
    filterFn: 'boolean',
    cell: (info) => (info.getValue() ? 'Yes' : 'No'),
  }),
  columnHelper.accessor('issuedAt', {
    header: 'Issued at',
    filterFn: 'dateRange',
  }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    filterFn: 'numberRange',
    cell: (info) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
        info.getValue()
      ),
  }),
]

type StatusBadgeProps = { status: Invoice['status'] }

const STATUS_COLORS: Record<Invoice['status'], string> = {
  draft: '#6b7280',
  pending: '#d97706',
  paid: '#16a34a',
  failed: '#dc2626',
  cancelled: '#9ca3af',
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.1rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#fff',
        background: STATUS_COLORS[status],
      }}
    >
      {status}
    </span>
  )
}

type InvoiceTableProps = {
  data: Invoice[]
  columnFilters: TanStackColumnFiltersState
}

export function InvoiceTable({ data, columnFilters }: InvoiceTableProps) {
  const table = useReactTable({
    data,
    columns,
    state: { columnFilters },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: filterBridgeFilterFns,
  })

  const rows = table.getFilteredRowModel().rows

  return (
    <div className="invoice-table-wrapper">
      <div className="invoice-table-meta">
        {rows.length} of {data.length} invoices
      </div>
      <div className="invoice-table-scroll">
        <table className="invoice-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="invoice-table-empty">
                  No invoices match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
