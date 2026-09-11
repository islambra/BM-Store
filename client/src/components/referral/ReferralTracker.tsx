import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackReferral } from '../../services/api'
import { getVisitorId, getStoredReferral, isStoredReferralExpired } from '../../services/referral'

/**
 * Best-effort referral attribution. Tracks every visit that carries a ?ref code
 * (the server enforces a 7-day window and "last valid referral wins"), and keeps
 * the latest referral id available for checkout + registration.
 */
export default function ReferralTracker() {
  const location = useLocation()

  useEffect(() => {
    const code = new URLSearchParams(location.search).get('ref')?.trim().toUpperCase()
    if (!code) return

    const visitorId = getVisitorId()
    void trackReferral({ referralCode: code, path: location.pathname, visitorId })
      .then(({ referralId, expiresAt }) => {
        if (referralId) storeReferralLocally(referralId, code, expiresAt)
      })
      .catch(() => {
        /* tracking is best-effort */
      })
  }, [location.search, location.pathname])

  useEffect(() => {
    const stored = getStoredReferral()
    if (stored && isStoredReferralExpired(stored)) localStorage.removeItem('bm-referral')
  }, [location.pathname])

  return null
}

function storeReferralLocally(id: string, code: string, expiresAt?: string) {
  localStorage.setItem('bm-referral', JSON.stringify({ id, code, expiresAt }))
}