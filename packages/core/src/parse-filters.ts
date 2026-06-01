import type { AnyFilter, MultiSelectFilter, SelectFilter } from './filter-types'
import type { InferFilterState } from './infer'

type RawInput = Record<string, unknown>

function normalizeInput(input: RawInput | URLSearchParams): RawInput {
  if (typeof URLSearchParams !== 'undefined' && input instanceof URLSearchParams) {
    const result: RawInput = {}
    input.forEach((value, key) => {
      result[key] = value
    })
    return result
  }
  return input as RawInput
}

function parseText(raw: RawInput, key: string): string | undefined {
  const val = raw[key]
  if (typeof val !== 'string') return undefined
  const trimmed = val.trim()
  return trimmed || undefined
}

function parseSelect(
  raw: RawInput,
  key: string,
  filter: SelectFilter<readonly string[]>
): string | undefined {
  const val = raw[key]
  if (typeof val !== 'string') return undefined
  return filter.options.includes(val) ? val : undefined
}

function parseMultiSelect(
  raw: RawInput,
  key: string,
  filter: MultiSelectFilter<readonly string[]>
): string[] | undefined {
  const val = raw[key]
  let items: string[]

  if (typeof val === 'string') {
    items = val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  } else if (Array.isArray(val)) {
    items = val.filter((v): v is string => typeof v === 'string')
  } else {
    return undefined
  }

  const valid = items.filter((item) => filter.options.includes(item))
  return valid.length > 0 ? valid : undefined
}

function parseBoolean(raw: RawInput, key: string): boolean | undefined {
  const val = raw[key]
  if (val === true || val === 'true' || val === '1') return true
  if (val === false || val === 'false' || val === '0') return false
  return undefined
}

function parseDateRange(
  raw: RawInput,
  key: string
): { from?: string; to?: string } | undefined {
  const from = raw[`${key}From`]
  const to = raw[`${key}To`]
  const range: { from?: string; to?: string } = {}

  if (typeof from === 'string' && from.trim()) range.from = from.trim()
  if (typeof to === 'string' && to.trim()) range.to = to.trim()

  return range.from !== undefined || range.to !== undefined ? range : undefined
}

function parseNumberRange(
  raw: RawInput,
  key: string
): { min?: number; max?: number } | undefined {
  const minVal = raw[`${key}Min`]
  const maxVal = raw[`${key}Max`]
  const range: { min?: number; max?: number } = {}

  if (typeof minVal === 'string') {
    const n = parseFloat(minVal)
    if (!isNaN(n)) range.min = n
  } else if (typeof minVal === 'number' && !isNaN(minVal)) {
    range.min = minVal
  }

  if (typeof maxVal === 'string') {
    const n = parseFloat(maxVal)
    if (!isNaN(n)) range.max = n
  } else if (typeof maxVal === 'number' && !isNaN(maxVal)) {
    range.max = maxVal
  }

  return range.min !== undefined || range.max !== undefined ? range : undefined
}

export function parseFilters<S extends Record<string, AnyFilter>>(
  schema: S,
  input: RawInput | URLSearchParams
): InferFilterState<S> {
  const raw = normalizeInput(input)
  const result: Record<string, unknown> = {}

  for (const [key, filter] of Object.entries(schema)) {
    let value: unknown

    switch (filter._kind) {
      case 'text':
        value = parseText(raw, key)
        break
      case 'select':
        value = parseSelect(raw, key, filter)
        break
      case 'multiSelect':
        value = parseMultiSelect(raw, key, filter)
        break
      case 'boolean':
        value = parseBoolean(raw, key)
        break
      case 'dateRange':
        value = parseDateRange(raw, key)
        break
      case 'numberRange':
        value = parseNumberRange(raw, key)
        break
    }

    if (value !== undefined) {
      result[key] = value
    }
  }

  return result as InferFilterState<S>
}
