function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    return Object.values(value as object).every((v) => v === undefined || v === null)
  }
  return false
}

export function cleanFilterState<T extends Record<string, unknown>>(state: T): T {
  const result = {} as T
  for (const key of Object.keys(state)) {
    const value = (state as Record<string, unknown>)[key]
    if (!isEmptyValue(value)) {
      ;(result as Record<string, unknown>)[key] = value
    }
  }
  return result
}
