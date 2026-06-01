import { parseFilters } from '@filterbridge/core'
import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import { normalizeNextSearchParams } from './normalize-next-search-params'
import type { MaybePromise, NextSearchParamsInput } from './types'

/**
 * Parses a Next.js App Router searchParams value into typed FilterBridge state.
 *
 * Accepts the plain record Next.js provides in server components, URLSearchParams,
 * or any ReadonlyURLSearchParams-like object. Returns InferFilterState<S>.
 *
 * Does not access window. Safe for server components and edge functions.
 */
export function parseNextSearchParams<S extends FilterSchema>(
  schema: S,
  searchParams?: NextSearchParamsInput
): InferFilterState<S> {
  const normalized = normalizeNextSearchParams(schema, searchParams)
  return parseFilters(schema, normalized)
}

/**
 * Async variant of parseNextSearchParams. Accepts the searchParams value wrapped
 * in a Promise, which Next.js 15+ may provide in server components.
 *
 * If given a non-Promise value, resolves immediately.
 */
export async function parseNextSearchParamsAsync<S extends FilterSchema>(
  schema: S,
  searchParams?: MaybePromise<NextSearchParamsInput>
): Promise<InferFilterState<S>> {
  const resolved = await searchParams
  return parseNextSearchParams(schema, resolved)
}
