import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Package, Store, User } from 'lucide-react'
import Logo from '../common/Logo'
import LanguageSwitcher from '../common/LanguageSwitcher'
import LogoutModal from '../common/LogoutModal'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

function UserInitial({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-brand-100" />
  }
  const initial = name.trim().charAt(0).toUpperCase() || '؟'
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white ring-2 ring-brand-100">
      {initial}
    </span>
  )
}

export default function ClientDashboardLayout() {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      /* best-effort, state is cleared locally */
    } finally {
      setLoggingOut(false)
      setLogoutOpen(false)
    }
    navigate('/', { replace: true })
  }

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-brand-600 text-white shadow-soft' : 'text-ink-600 hover:bg-ink-900/5 hover:text-ink-900'
    }`

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between gap-3">
          <Link to="/" aria-label="BM Store">
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
            >
              <Store size={15} />
              <span className="hidden sm:inline">{t('common.backToStore')}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container-app flex-1 py-6 sm:py-8">
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              {user && (
                <div className="flex items-center gap-3 border-b border-line bg-canvas/60 px-4 py-4">
                  <UserInitial name={user.name} image={user.avatar} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
                    <p className="truncate text-xs text-ink-400" dir="ltr">{user.phone}</p>
                  </div>
                </div>
              )}
              <nav className="space-y-1 p-2.5" aria-label={t('account.dashboard')}>
                <NavLink to="/dashboard/profile" end className={navCls}>
                  <User size={16} />
                  {t('client.profile')}
                </NavLink>
                <NavLink to="/dashboard/orders" className={navCls}>
                  <Package size={16} />
                  {t('client.orders')}
                </NavLink>
              </nav>
              <div className="border-t border-line p-2.5">
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-50"
                >
                  <LogOut size={16} />
                  {t('common.logout')}
                </button>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            {/* Compact nav (mobile / tablet) */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:hidden">
              <NavLink
                to="/dashboard/profile"
                end
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-brand-600 text-white shadow-soft' : 'bg-surface text-ink-700 hover:bg-ink-900/5'
                  }`
                }
              >
                <User size={16} />
                {t('client.profile')}
              </NavLink>
              <NavLink
                to="/dashboard/orders"
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-brand-600 text-white shadow-soft' : 'bg-surface text-ink-700 hover:bg-ink-900/5'
                  }`
                }
              >
                <Package size={16} />
                {t('client.orders')}
              </NavLink>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-danger-600"
                aria-label={t('common.logout')}
              >
                <LogOut size={16} />
              </button>
            </div>
            <Outlet />
          </div>
        </div>
      </main>

      {/* Subtle footer strip */}
      <footer className="border-t border-line bg-surface">
        <div className="container-app flex items-center justify-center gap-1.5 py-4 text-xs text-ink-400">
          <LayoutDashboard size={13} />
          {t('brand.storeName')} · {t('footer.rights')}
        </div>
      </footer>

      <LogoutModal
        open={logoutOpen}
        busy={loggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </div>
  )
}
