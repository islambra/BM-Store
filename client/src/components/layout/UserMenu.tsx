import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, Store, User, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { getAccountLabel, getAccountRoute } from '../../utils/account'
import LogoutModal from '../common/LogoutModal'

type Variant = 'desktop' | 'mobile'

interface MenuItem {
  label: string
  icon: LucideIcon
  to?: string
  onClick?: () => void
}

export default function UserMenu({ variant }: { variant: Variant }) {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const wrapRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

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

  if (!user) {
    const label = t('common.account')
    const to = getAccountRoute(undefined)

    if (variant === 'desktop') {
      return (
        <Link to={to} className="icon-btn" aria-label={label} title={label}>
          <User size={20} />
        </Link>
      )
    }

    const isActivePage = location.pathname === to
    return (
      <Link
        to={to}
        aria-label={label}
        aria-current={isActivePage ? 'page' : undefined}
        className="relative flex w-full flex-col items-center gap-0.5 py-2"
      >
        <span
          className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
            isActivePage
              ? 'bg-brand-600 text-white shadow-[0_4px_10px_rgb(36_83_224/0.35)]'
              : 'text-ink-500'
          }`}
        >
          <User size={19} strokeWidth={isActivePage ? 2.4 : 2} />
        </span>
        <span className={`max-w-full truncate text-[10px] leading-none ${isActivePage ? 'font-bold text-brand-700' : 'font-medium text-ink-500'}`}>
          {label}
        </span>
      </Link>
    )
  }

  const requestLogout = () => {
    setOpen(false)
    setLogoutOpen(true)
  }

  const items: MenuItem[] =
    user.role === 'ADMIN'
      ? [{ label: getAccountLabel(user.role, t), icon: ShieldCheck, to: '/admin' }]
      : user.role === 'USER'
        ? [{ label: getAccountLabel(user.role, t), icon: LayoutDashboard, to: '/dashboard/profile' }]
        : [{ label: getAccountLabel(user.role, t), icon: Store, to: '/marketer' }]

  const triggerLabel = getAccountLabel(user.role, t)
  const Icon = user.role === 'ADMIN' ? ShieldCheck : user.role === 'MARKETER' ? Store : User

  if (variant === 'desktop') {
    return (
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={triggerLabel}
          title={triggerLabel}
          className="flex h-10 items-center gap-1 rounded-xl px-2 text-ink-500 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
        >
          <Icon size={20} />
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute end-0 top-full z-50 mt-2 w-64 animate-pop rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
          >
            <div className="border-b border-line px-3 pb-2.5 pt-1.5">
              <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
              <p className="truncate text-xs text-ink-400" dir="ltr">{user.phone}</p>
            </div>
            <div className="pt-1.5">
              {items.map((item) => {
                const cls =
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-900/5 hover:text-ink-900'
                if (item.onClick) {
                  return (
                    <button key={item.label} type="button" onClick={item.onClick} role="menuitem" className={cls}>
                      <item.icon size={17} className="text-ink-400" />
                      {item.label}
                    </button>
                  )
                }
                return (
                  <Link
                    key={item.to}
                    to={item.to as string}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={cls}
                  >
                    <item.icon size={17} className="text-ink-400" />
                    {item.label}
                  </Link>
                )
              })}
              <button
                type="button"
                onClick={requestLogout}
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-50 hover:text-danger-700"
              >
                <LogOut size={17} />
                {t('common.logout')}
              </button>
            </div>
          </div>
        )}

        <LogoutModal
          open={logoutOpen}
          busy={loggingOut}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => void handleLogout()}
        />
      </div>
    )
  }

  const userRouteActive = ['/dashboard', '/admin'].some((p) => location.pathname.startsWith(p))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('common.account')}
        aria-current={userRouteActive ? 'page' : undefined}
        className="relative flex w-full flex-col items-center gap-0.5 py-2"
      >
        <span
          className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
            userRouteActive
              ? 'bg-brand-600 text-white shadow-[0_4px_10px_rgb(36_83_224/0.35)]'
              : 'text-ink-500'
          }`}
        >
          <Icon size={19} strokeWidth={userRouteActive ? 2.4 : 2} />
        </span>
        <span className={`max-w-full truncate text-[10px] leading-none ${userRouteActive ? 'font-bold text-brand-700' : 'font-medium text-ink-500'}`}>
          {t('common.account')}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/50" onClick={() => setOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl border-t border-line bg-surface p-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            role="menu"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
                <p className="truncate text-xs text-ink-400" dir="ltr">{user.phone}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')} className="icon-btn shrink-0 text-ink-400">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {items.map((item) => {
                const cls =
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-900/5'
                if (item.onClick) {
                  return (
                    <button key={item.label} type="button" onClick={item.onClick} role="menuitem" className={cls}>
                      <item.icon size={18} className="text-ink-400" />
                      {item.label}
                    </button>
                  )
                }
                return (
                  <Link key={item.to} to={item.to as string} onClick={() => setOpen(false)} role="menuitem" className={cls}>
                    <item.icon size={18} className="text-ink-400" />
                    {item.label}
                  </Link>
                )
              })}
              <button
                type="button"
                onClick={requestLogout}
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-danger-600 transition-colors hover:bg-danger-50"
              >
                <LogOut size={18} />
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      <LogoutModal
        open={logoutOpen}
        busy={loggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </>
  )
}