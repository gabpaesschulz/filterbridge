function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'number') return !Number.isFinite(value)
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    // Recursive so a range whose sides are all empty strings — the shape an
    // emptied <input type="date"> produces — counts as empty, not just one
    // whose sides are nullish.
    return Object.values(value as object).every(isEmptyValue)
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
