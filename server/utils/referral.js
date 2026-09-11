import crypto from 'node:crypto'

export const REFERRAL_VALID_MS = 7 * 24 * 60 * 60 * 1000

export function generateReferralCode(length = 10) {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length)
}

export function generateVisitorId() {
  return crypto.randomBytes(16).toString('hex')
}

export function referralExpiry() {
  return new Date(Date.now() + REFERRAL_VALID_MS)
}

export function appBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
}

export function referralLink(referralCode) {
  return `${appBaseUrl()}/?ref=${referralCode}`
}

export function productReferralLink(referralCode, slug) {
  const base = appBaseUrl().replace(/\/$/, '')
  return slug ? `${base}/product/${slug}?ref=${referralCode}` : `${base}/?ref=${referralCode}`
}