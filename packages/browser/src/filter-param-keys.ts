import type { FilterSchema } from '@filterbridge/core'

export function getFilterParamKeys(schema: FilterSchema): string[] {
  const keys: string[] = []
  for (const [key, filter] of Object.entries(schema)) {
    switch (filter._kind) {
      case 'dateRange':
        keys.push(`${key}From`, `${key}To`)
        break
      case 'numberRange':
        keys.push(`${key}Min`, `${key}Max`)
        break
      default:
        keys.push(key)
    }
  }
  return keys
}
