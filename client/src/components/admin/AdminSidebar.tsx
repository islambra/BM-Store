import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Tags,
  Users,
  Megaphone,
  Image,
  CreditCard,
  UserRound,
  LogOut,
  X,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

interface AdminSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { id: 'overview', label: 'admin.tabs.overview', icon: LayoutDashboard, href: '/admin' },
  { id: 'orders', label: 'admin.tabs.orders', icon: ClipboardList, href: '/admin/orders' },
  { id: 'products', label: 'admin.tabs.products', icon: Package, href: '/admin/products' },
  { id: 'categories', label: 'admin.tabs.categories', icon: Tags, href: '/admin/categories' },
  { id: 'customers', label: 'admin.tabs.customers', icon: Users, href: '/admin/customers' },
  { id: 'marketers', label: 'admin.tabs.marketers', icon: Megaphone, href: '/admin/marketers' },
  { id: 'banners', label: 'admin.tabs.banners', icon: Image, href: '/admin/banners' },
  { id: 'payouts', label: 'admin.tabs.payouts', icon: CreditCard, href: '/admin/payouts' },
  { id: 'profile', label: 'admin.tabs.profile', icon: UserRound, href: '/admin/profile' },
]

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    onClose()
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 icon-btn bg-surface border border-line shadow-lg"
        onClick={() => onClose()}
        aria-label={t('common.close')}
      >
        <X size={20} />
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-line flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label={t('admin.sidebar')}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-line px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Package size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-ink-900">{t('brand.storeName')} Admin</span>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" role="navigation" aria-label={t('admin.navigation')}>
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.href}
                end={item.id === 'overview'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-ink-700 hover:bg-ink-900/5'
                  }`
                }
                onClick={onClose}
              >
                <item.icon size={18} aria-hidden="true" />
                {t(item.label)}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-line p-3 space-y-1">
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 bg-ink-900/5">
              <UserRound size={18} className="text-brand-600" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-ink-900">{user?.name}</p>
                <p className="truncate text-xs text-ink-500 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <LogOut size={18} />
              {t('common.logout')}
            </button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  )
}