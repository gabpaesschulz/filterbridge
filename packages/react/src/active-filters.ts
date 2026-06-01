export function countActiveFilters(state: Record<string, unknown>): number {
  return Object.keys(state).length
}
