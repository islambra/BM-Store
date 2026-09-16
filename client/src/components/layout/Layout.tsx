import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import MobileNav from './MobileNav'
import ReferralTracker from '../referral/ReferralTracker'
import { isStoreSubdomain } from '../../utils/storeUrl'

const AUTH_PATHS = ['/login', '/register', '/marketer/signup', '/marketer/login', '/seller/register', '/seller/login']
const FOOTERLESS_PATHS = ['/cart', '/wishlist', '/marketer']

export default function Layout() {
  const { pathname } = useLocation()
  const isAuthPage = AUTH_PATHS.includes(pathname)
  const isStoreHost = isStoreSubdomain()
  const showFooter =
    !isAuthPage &&
    !FOOTERLESS_PATHS.includes(pathname) &&
    !pathname.startsWith('/posts') &&
    !pathname.startsWith('/store') &&
    !isStoreHost
  return (
    <div className="flex min-h-screen flex-col">
      <ReferralTracker />
      {!isAuthPage && <Header />}
      <main className="flex-1 pb-32 lg:pb-0">
        <Outlet />
      </main>
      {showFooter && <Footer />}
      {!isAuthPage && <MobileNav />}
    </div>
  )
}