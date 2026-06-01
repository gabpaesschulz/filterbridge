import { createFilterUrl } from '@filterbridge/browser'
import type { FilterSchema, InferFilterState } from '@filterbridge/core'
import type { CreateNextFilterHrefOptions, NextSearchParamsInput } from './types'
import { inputToRawRecord } from './normalize-next-search-params'

/**
 * Converts a NextSearchParamsInput to a URLSearchParams so it can be passed
 * to createFilterUrl's currentSearch option.
 */
function nextInputToURLSearchParams(input: NextSearchParamsInput): URLSearchParams | undefined {
  if (input == null) return undefined

  // Real URLSearchParams — use directly
  if (typeof URLSearchParams !== 'undefined' && input instanceof URLSearchParams) {
    return input
  }

  const raw = inputToRawRecord(input)
  const sp = new URLSearchParams()

  for (const [key, val] of Object.entries(raw)) {
    if (val === undefined) continue
    if (Array.isArray(val)) {
      for (const v of val) sp.append(key, v)
    } else {
      sp.set(key, val)
    }
  }

  return sp
}

/**
 * Builds an href string suitable for Next.js <Link href="...">, router.push(), or
 * router.replace(). Does not access window and is safe to call in server components.
 *
 * By default (preserveExistingParams: true), non-filter params from searchParams
 * are preserved and old filter params are replaced with the new state.
 *
 * @example
 * const href = createNextFilterHref(invoiceFilters, { search: 'acme' }, {
 *   pathname: '/invoices',
 *   searchParams: { tab: 'open', search: 'old' },
 * })
 * // => '/invoices?tab=open&search=acme'
 */
export function createNextFilterHref<S extends FilterSchema>(
  schema: S,
  state: InferFilterState<S>,
  options?: CreateNextFilterHrefOptions
): string {
  const currentSearch =
    options?.searchParams != null ? nextInputToURLSearchParams(options.searchParams) : undefined

  return createFilterUrl(schema, state, {
    pathname: options?.pathname ?? '/',
    currentSearch,
    hash: options?.hash,
    preserveExistingParams: options?.preserveExistingParams,
  })
}
