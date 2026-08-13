export type UrlLike = string | URL | URLSearchParams | { search: string }

export type CreateFilterUrlOptions = {
  pathname?: string
  currentSearch?: string | URLSearchParams
  hash?: string
  preserveExistingParams?: boolean
}

export type SyncUrlOptions = CreateFilterUrlOptions & {
  history?: Pick<History, 'replaceState' | 'pushState'>
  state?: unknown
  title?: string
}

export type UsePopstateSyncOptions = {
  /** Set to `false` to keep the listener detached. Defaults to `true`. */
  enabled?: boolean
}
