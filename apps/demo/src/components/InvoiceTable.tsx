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
    cell: (info) => <span>{info.getValue().length > 0 ? info.getValue().join(', ') : '—'}</span>,
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

/**
 * Dark text on a light tint, defined in styles.css rather than inline. White on
 * the saturated fills these used before was 2.54–3.30:1, and no hue at this
 * lightness reaches AA against white without going dark enough to stop reading
 * as a status colour.
 */
function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-pill status-pill-${status}`}>{status}</span>
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
