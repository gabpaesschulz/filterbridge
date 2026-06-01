import type {
  AnyFilter,
  FilterSchema,
  InferFilterState,
  MultiSelectFilter,
  SelectFilter,
} from '@filterbridge/core'
import type {
  TanStackColumnFiltersState,
  FromTanStackColumnFiltersOptions,
} from './types'
import { buildReverseColumnIdMap, isEmpty } from './utils'

function coerceText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function coerceSelect(
  value: unknown,
  filter: SelectFilter<readonly string[]>
): string | undefined {
  if (typeof value !== 'string') return undefined
  return filter.options.includes(value) ? value : undefined
}

function coerceMultiSelect(
  value: unknown,
  filter: MultiSelectFilter<readonly string[]>
): string[] | undefined {
  let items: string[]

  if (Array.isArray(value)) {
    items = value.filter((v): v is string => typeof v === 'string')
  } else if (typeof value === 'string') {
    items = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  } else {
    return undefined
  }

  const valid = items.filter((item) => filter.options.includes(item))
  return valid.length > 0 ? valid : undefined
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === '1' || value === 1) return true
  if (value === false || value === 'false' || value === '0' || value === 0) return false
  return undefined
}

function coerceDateRange(
  value: unknown
): { from?: string; to?: string } | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const obj = value as Record<string, unknown>
  const range: { from?: string; to?: string } = {}
  if (typeof obj.from === 'string' && obj.from.trim()) range.from = obj.from.trim()
  if (typeof obj.to === 'string' && obj.to.trim()) range.to = obj.to.trim()
  return range.from !== undefined || range.to !== undefined ? range : undefined
}

function coerceNumberRange(
  value: unknown
): { min?: number; max?: number } | undefined {
  // Accept { min, max } object
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    const range: { min?: number; max?: number } = {}
    const min = typeof obj.min === 'number' ? obj.min : parseFloat(String(obj.min))
    const max = typeof obj.max === 'number' ? obj.max : parseFloat(String(obj.max))
    if (!isNaN(min)) range.min = min
    if (!isNaN(max)) range.max = max
    return range.min !== undefined || range.max !== undefined ? range : undefined
  }
  // Accept [min, max] tuple
  if (Array.isArray(value) && value.length === 2) {
    const range: { min?: number; max?: number } = {}
    const min = typeof value[0] === 'number' ? value[0] : parseFloat(String(value[0]))
    const max = typeof value[1] === 'number' ? value[1] : parseFloat(String(value[1]))
    if (!isNaN(min)) range.min = min
    if (!isNaN(max)) range.max = max
    return range.min !== undefined || range.max !== undefined ? range : undefined
  }
  return undefined
}

function coerceValue(value: unknown, filter: AnyFilter): unknown {
  switch (filter._kind) {
    case 'text':
      return coerceText(value)
    case 'select':
      return coerceSelect(value, filter)
    case 'multiSelect':
      return coerceMultiSelect(value, filter)
    case 'boolean':
      return coerceBoolean(value)
    case 'dateRange':
      return coerceDateRange(value)
    case 'numberRange':
      return coerceNumberRange(value)
  }
}

export function fromTanStackColumnFilters<S extends FilterSchema>(
  schema: S,
  columnFilters: TanStackColumnFiltersState,
  options?: FromTanStackColumnFiltersOptions<S>
): InferFilterState<S> {
  const reverseMap = buildReverseColumnIdMap<S>(options?.columnIds)
  const result: Record<string, unknown> = {}

  for (const { id, value } of columnFilters) {
    // Resolve columnId → filterKey using reverse map, else use id directly
    const filterKey = reverseMap.get(id) ?? id

    const filter = (schema as Record<string, AnyFilter>)[filterKey]
    if (!filter) continue

    const coerced = coerceValue(value, filter)
    if (!isEmpty(coerced) && coerced !== undefined) {
      result[filterKey] = coerced
    }
  }

  return result as InferFilterState<S>
}
