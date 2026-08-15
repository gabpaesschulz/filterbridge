import { filterDefault } from './defaults'
import type { AnyFilter, MultiSelectFilter, SelectFilter } from './filter-types'
import { isValidOption, validOptions } from './filter-validation'
import type { InferFilterState } from './infer'

type RawInput = Record<string, unknown>

function normalizeInput(input: RawInput | URLSearchParams): RawInput {
  if (typeof URLSearchParams !== 'undefined' && input instanceof URLSearchParams) {
    const result: RawInput = {}
    for (const key of new Set(input.keys())) {
      const all = input.getAll(key)
      result[key] = all.length > 1 ? all : all[0]
    }
    return result
  }
  return input as RawInput
}

/**
 * Resolves a raw value for a single-valued filter. Repeated query params arrive
 * as an array; scalar filters take the first element, matching the behavior
 * documented by @filterbridge/next.
 */
function scalar(val: unknown): unknown {
  return Array.isArray(val) ? val[0] : val
}

function parseText(raw: RawInput, key: string): string | undefined {
  const val = scalar(raw[key])
  if (typeof val !== 'string') return undefined
  const trimmed = val.trim()
  return trimmed || undefined
}

function parseSelect(
  raw: RawInput,
  key: string,
  filter: SelectFilter<readonly string[]>
): string | undefined {
  const val = scalar(raw[key])
  return isValidOption(filter, val) ? val : undefined
}

function parseMultiSelect(
  raw: RawInput,
  key: string,
  filter: MultiSelectFilter<readonly string[]>
): string[] | undefined {
  const val = raw[key]
  let sources: unknown[]

  if (typeof val === 'string') {
    sources = [val]
  } else if (Array.isArray(val)) {
    sources = val
  } else {
    return undefined
  }

  // Each entry may itself be comma-separated, so `tags=a,b&tags=c` yields
  // ['a', 'b', 'c'] rather than discarding the 'a,b' entry as an invalid option.
  const items = sources
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.split(',').map((s) => s.trim()))
    .filter(Boolean)

  const valid = validOptions(filter, items)
  return valid.length > 0 ? valid : undefined
}

function parseBoolean(raw: RawInput, key: string): boolean | undefined {
  const val = scalar(raw[key])
  if (val === true || val === 'true' || val === '1') return true
  if (val === false || val === 'false' || val === '0') return false
  return undefined
}

function parseDateRange(raw: RawInput, key: string): { from?: string; to?: string } | undefined {
  const from = scalar(raw[`${key}From`])
  const to = scalar(raw[`${key}To`])
  const range: { from?: string; to?: string } = {}

  if (typeof from === 'string' && from.trim()) range.from = from.trim()
  if (typeof to === 'string' && to.trim()) range.to = to.trim()

  return range.from !== undefined || range.to !== undefined ? range : undefined
}

function parseNumberRange(raw: RawInput, key: string): { min?: number; max?: number } | undefined {
  const minVal = scalar(raw[`${key}Min`])
  const maxVal = scalar(raw[`${key}Max`])
  const range: { min?: number; max?: number } = {}

  // `Number.isFinite`, not `!isNaN`: parseFloat('Infinity') is Infinity, and so
  // is parseFloat('1e999'). A non-finite value would enter state only for the
  // serializers to drop it again — the same leak task 2 closed on the way out.
  if (typeof minVal === 'string') {
    const n = parseFloat(minVal)
    if (Number.isFinite(n)) range.min = n
  } else if (typeof minVal === 'number' && Number.isFinite(minVal)) {
    range.min = minVal
  }

  if (typeof maxVal === 'string') {
    const n = parseFloat(maxVal)
    if (Number.isFinite(n)) range.max = n
  } else if (typeof maxVal === 'number' && Number.isFinite(maxVal)) {
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

    // Every parser above returns undefined for a missing *and* for an invalid
    // value, so a configured default covers both cases with one check.
    if (value === undefined) {
      value = filterDefault(filter)
    }

    if (value !== undefined) {
      result[key] = value
    }
  }

  return result as InferFilterState<S>
}
