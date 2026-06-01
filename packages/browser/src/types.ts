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
