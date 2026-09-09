import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileNav from './MobileNav'
import { trackReferral } from '../../services/api'

const AUTH_PATHS = ['/login', '/register', '/marketer/signup', '/marketer/login']

function ReferralTracker() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('ref')
    if (code && !sessionStorage.getItem('bm-ref-tracked')) {
      sessionStorage.setItem('bm-ref-tracked', '1')
      void trackReferral({ referralCode: code, path: window.location.pathname })
        .then(({ referralId }) => {
          if (referralId) sessionStorage.setItem('bm-referral-id', referralId)
        })
        .catch(() => {
          /* tracking is best-effort */
        })
    }
  }, [])
  return null
}

export default function Layout() {
  const { pathname } = useLocation()
  const isAuthPage = AUTH_PATHS.includes(pathname)
  return (
    <div className="flex min-h-screen flex-col">
      <ReferralTracker />
      {!isAuthPage && <Header />}
      <main className="flex-1 pb-28 lg:pb-0">
        <Outlet />
      </main>
      {!isAuthPage && <Footer />}
      <MobileNav />
    </div>
  )
}