// Absolute public URL of a storefront page. During development it is the local
// app origin; once the app is deployed, set VITE_APP_URL to the public site URL.
export function storeUrl(slug?: string | null) {
  const base = (import.meta.env.VITE_APP_URL as string | undefined)?.trim() || window.location.origin
  const origin = base.replace(/\/+$/, '')
  return slug ? `${origin}/store/${slug}` : origin
}