const VISITOR_KEY = 'bm-visitor-id'
const REFERRAL_KEY = 'bm-referral'

export interface StoredReferral {
  id: string
  code: string
  expiresAt?: string
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = makeId()
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

export function getStoredReferral(): StoredReferral | null {
  const raw = localStorage.getItem(REFERRAL_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredReferral
    if (parsed.id) return parsed
  } catch {
    /* corrupted — ignore */
  }
  return null
}

export function storeReferral(referral: StoredReferral): void {
  localStorage.setItem(REFERRAL_KEY, JSON.stringify(referral))
}

export function isStoredReferralExpired(referral: StoredReferral): boolean {
  if (!referral.expiresAt) return false
  return new Date(referral.expiresAt).getTime() <= Date.now()
}

export function clearReferral(): void {
  localStorage.removeItem(REFERRAL_KEY)
}