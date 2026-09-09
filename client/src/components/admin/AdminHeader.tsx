import { useState, useRef, useEffect } from 'react'
import { UserRound, ChevronDown, LogOut, Package } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface AdminHeaderProps {
  title: string
  subtitle?: string
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="container-app flex h-16 items-center gap-4">
        <button
          type="button"
          className="lg:hidden icon-btn"
          onClick={() => document.dispatchEvent(new CustomEvent('admin-sidebar-toggle'))}
          aria-label={t('admin.toggleMenu')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Package size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-ink-900">BM Store Admin</span>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-ink-900 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-ink-900/5 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-900/10 transition-colors"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <UserRound size={16} />
              </div>
              <span className="hidden sm:block">{user?.name}</span>
              <ChevronDown size={16} className={profileOpen ? 'rotate-180' : ''} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface shadow-lg py-1.5 animate-in fade-in-0 zoom-in-95">
                <div className="px-3 py-2 border-b border-line">
                  <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
                  {user?.email && <p className="text-xs text-ink-500 truncate">{user?.email}</p>}
                  <span className="inline-flex mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-brand-100 text-brand-700 capitalize">
                    {user?.role?.toLowerCase()}
                  </span>
                </div>
                <a
                  href="/admin/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-900/5"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserRound size={16} />
                  {t('admin.tabs.profile')}
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <LogOut size={16} />
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}