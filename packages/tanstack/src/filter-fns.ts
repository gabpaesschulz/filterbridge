import type { FilterFnLike } from './types'

const textFilterFn: FilterFnLike = (row, columnId, filterValue) => {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true
  const cellValue = String(row.getValue(columnId) ?? '')
  return cellValue.toLowerCase().includes(String(filterValue).toLowerCase())
}

const selectFilterFn: FilterFnLike = (row, columnId, filterValue) => {
  if (filterValue === undefined || filterValue === null || filterValue === '') return true
  return row.getValue(columnId) === filterValue
}

const multiSelectFilterFn: FilterFnLike = (row, columnId, filterValue) => {
  if (!Array.isArray(filterValue) || filterValue.length === 0) return true
  const cellValue = row.getValue(columnId)
  if (Array.isArray(cellValue)) {
    return cellValue.some((v) => filterValue.includes(v))
  }
  return filterValue.includes(cellValue)
}

const booleanFilterFn: FilterFnLike = (row, columnId, filterValue) => {
  if (typeof filterValue !== 'boolean') return true
  return row.getValue(columnId) === filterValue
}

const dateRangeFilterFn: FilterFnLike = (row, columnId, filterValue) => {
  if (
    typeof filterValue !== 'object' ||
    filterValue === null ||
    Array.isArray(filterValue)
  )
    return true

  const range = filterValue as { from?: string; to?: string }
  if (!range.from && !range.to) return true

  const cellValue = String(row.getValue(columnId) ?? '')
  if (!cellValue) return false

  if (range.from && cellValue < range.from) return false
  if (range.to && cellValue > range.to) return false
  return true
}

const numberRangeFilterFn: FilterFnLike = (row, columnId, filterValue) => {
  if (
    typeof filterValue !== 'object' ||
    filterValue === null ||
    Array.isArray(filterValue)
  )
    return true

  const range = filterValue as { min?: number; max?: number }
  if (range.min === undefined && range.max === undefined) return true

  const raw = row.getValue(columnId)
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
  if (isNaN(num)) return false

  if (range.min !== undefined && num < range.min) return false
  if (range.max !== undefined && num > range.max) return false
  return true
}

export const filterBridgeFilterFns = {
  text: textFilterFn,
  select: selectFilterFn,
  multiSelect: multiSelectFilterFn,
  boolean: booleanFilterFn,
  dateRange: dateRangeFilterFn,
  numberRange: numberRangeFilterFn,
} as const
