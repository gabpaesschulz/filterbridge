export type NextSearchParamsRecord = Record<string, string | string[] | undefined>

export type ReadonlyURLSearchParamsLike = {
  get?: (name: string) => string | null
  getAll?: (name: string) => string[]
  entries?: () => IterableIterator<[string, string]>
  toString?: () => string
}

export type NextSearchParamsInput =
  | NextSearchParamsRecord
  | URLSearchParams
  | ReadonlyURLSearchParamsLike
  | null
  | undefined

export type MaybePromise<T> = T | Promise<T>

export type CreateNextFilterHrefOptions = {
  pathname?: string
  searchParams?: NextSearchParamsInput
  hash?: string
  preserveExistingParams?: boolean
}
