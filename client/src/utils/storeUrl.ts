// Store URLs + subdomain helpers.
//
// Seller stores are served on their own subdomain, e.g.
//   dev:  http://islam-store.localhost:5173
//   prod: https://islam-store.bmstore.com
//
// The base domain is configurable via VITE_STORE_BASE_DOMAIN (e.g. "localhost"
// in development, "bmstore.com" in production) and falls back to the host of
// VITE_APP_URL (or the current origin) when not provided.

const getEnv = (key: string) => (import.meta.env[key] as string | undefined)?.trim()

const normalizeHost = (host: string) => host.split(':')[0].toLowerCase()

export const LANG_STORAGE_KEY = 'bm-store-lang'

export type UrlLang = 'en' | 'ar'

const isUrlLang = (value: string | null): value is UrlLang => value === 'en' || value === 'ar'

/** Language from the current ?lang= query param, if valid. */
export function langFromUrl(): UrlLang | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('lang')
  return isUrlLang(value) ? value : null
}

/** Language saved in localStorage on this origin, if valid. */
export function langFromStorage(): UrlLang | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(LANG_STORAGE_KEY)
    return isUrlLang(value) ? value : null
  } catch {
    return null
  }
}

/** Language is persisted in localStorage; keep URLs free of ?lang= query params. */
export function withLang(url: string): string {
  return url
}

/** Base domain on which store subdomains live (no "www." prefix, no port). */
export function getStoreBaseDomain(): string {
  const configured = getEnv('VITE_STORE_BASE_DOMAIN')
  if (configured) return normalizeHost(configured).replace(/^www\./, '')
  const appUrl = getEnv('VITE_APP_URL')
  if (appUrl) {
    try {
      return normalizeHost(new URL(appUrl).hostname).replace(/^www\./, '')
    } catch {
      /* fall through to the heuristic below */
    }
  }
  // No env configured. On a seller-store subdomain the store slug is the first
  // host label; in dev that means ".localhost" (e.g. islam-store.localhost), so
  // the base domain is the trailing "localhost". Handles *.localhost regardless
  // of whether the dev server was started with the env file present.
  const host = normalizeHost(window.location.hostname)
  const labels = host.split('.')
  if (labels.length > 1 && labels[labels.length - 1] === 'localhost') return 'localhost'
  return host.replace(/^www\./, '')
}

/** True when the current hostname is a seller store subdomain. */
export function isStoreSubdomain(): boolean {
  const host = normalizeHost(window.location.hostname)
  const base = getStoreBaseDomain()
  return host !== base && host !== `www.${base}` && host.endsWith(`.${base}`)
}

/** The store slug if the current hostname is a store subdomain, otherwise null. */
export function getStoreSlugFromHost(): string | null {
  if (!isStoreSubdomain()) return null
  const host = normalizeHost(window.location.hostname)
  return host.slice(0, -(getStoreBaseDomain().length + 1))
}

// Origin considered the app's public home (scheme/host/port as configured).
function resolveAppOrigin(): { protocol: string; host: string; port: string } {
  const appUrl = getEnv('VITE_APP_URL')
  if (appUrl) {
    const u = new URL(appUrl)
    return { protocol: u.protocol, host: normalizeHost(u.hostname), port: u.port }
  }
  const host = normalizeHost(window.location.hostname)
  const slug = isStoreSubdomain() ? getStoreSlugFromHost() : null
  return {
    protocol: window.location.protocol,
    host: slug ? getStoreBaseDomain() : host,
    port: window.location.port,
  }
}

/** Absolute URL of the main storefront site (never a seller subdomain). */
export function mainSiteUrl(path = '/') {
  const { protocol, host, port } = resolveAppOrigin()
  const base = `${protocol}//${host}${port ? `:${port}` : ''}`
  return withLang(`${base}${path.startsWith('/') ? path : `/${path}`}`)
}

/** Absolute public URL of a seller store, e.g. https://{slug}.{baseDomain}. */
export function storeUrl(slug?: string | null) {
  if (!slug) return mainSiteUrl()
  const { protocol, port } = resolveAppOrigin()
  const storeHost = `${slug}.${getStoreBaseDomain()}`
  return `${protocol}//${storeHost}${port ? `:${port}` : ''}`
}

/** Store URL that carries the current language (use for navigation links). */
export function storeVisitUrl(slug?: string | null) {
  if (!slug) return mainSiteUrl()
  return withLang(storeUrl(slug))
}

/** The ".domain" suffix shown next to a slug, e.g. ".bmstore.com". */
export function storeDomainSuffix() {
  return `.${getStoreBaseDomain()}`
}