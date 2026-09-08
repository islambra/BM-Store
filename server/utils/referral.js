import crypto from 'node:crypto'

export function generateReferralCode(length = 10) {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length)
}

export function appBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
}

export function referralLink(referralCode) {
  return `${appBaseUrl()}/?ref=${referralCode}`
}