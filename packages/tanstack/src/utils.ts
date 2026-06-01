import type { FilterSchema, InferFilterState } from '@filterbridge/core'

// Builds a reverse map from columnId → filterKey, given a columnIds option map.
export function buildReverseColumnIdMap<S extends FilterSchema>(
  columnIds: Partial<Record<keyof InferFilterState<S>, string>> | undefined
): Map<string, string> {
  const map = new Map<string, string>()
  if (!columnIds) return map
  for (const [filterKey, columnId] of Object.entries(columnIds)) {
    if (typeof columnId === 'string') {
      map.set(columnId, filterKey)
    }
  }
  return map
}

export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (Array.isArray(value) && value.length === 0) return true
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0
  )
    return true
  return false
}
