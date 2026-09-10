import { Link, NavLink, useLocation } from 'react-router-dom'
import { Heart, ShoppingCart, Megaphone } from 'lucide-react'
import Logo from '../common/Logo'
import LanguageSwitcher from '../common/LanguageSwitcher'
import SearchBar from '../common/SearchBar'
import UserMenu from './UserMenu'
import BecomeMarketerPrompt from '../common/BecomeMarketerPrompt'
import { useLanguage } from '../../context/LanguageContext'
import { useStore } from '../../context/StoreContext'
import { useAuth } from '../../context/AuthContext'
import { useBecomeMarketer } from '../../hooks/useBecomeMarketer'

const desktopLink =
  'inline-flex h-10 items-center px-3 text-sm font-semibold text-ink-700 transition-colors hover:text-brand-700'

const desktopActive =
  'inline-flex h-10 items-center border-b-2 border-brand-600 px-3 text-sm font-semibold text-brand-700'

const mobileLink =
  'inline-flex h-8 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-ink-900/5 hover:text-ink-900'

const mobileActive = 'inline-flex h-8 shrink-0 items-center rounded-full bg-brand-600 px-4 text-[13px] font-semibold text-white'

function CartIcon() {
  const { t } = useLanguage()
  const { cartCount } = useStore()
  return (
    <Link to="/cart" className="icon-btn relative" aria-label={t('common.cart')} title={t('common.cart')}>
      <ShoppingCart size={20} />
      {cartCount > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
          {cartCount}
        </span>
      )}
    </Link>
  )
}

function WishlistIcon() {
  const { t } = useLanguage()
  const { wishlistCount } = useStore()
  return (
    <Link to="/wishlist" className="icon-btn relative" aria-label={t('common.wishlist')} title={t('common.wishlist')}>
      <Heart size={20} />
      {wishlistCount > 0 && (
        <span className="absolute -end-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
          {wishlistCount}
        </span>
      )}
    </Link>
  )
}

export default function Header() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isMarketerRoute = location.pathname.startsWith('/marketer')
  const become = useBecomeMarketer()

  const nav = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/categories', label: t('nav.categories'), end: false },
    { to: '/special-offers', label: t('nav.deals'), end: false },
    { to: '/best-sellers', label: t('nav.bestSellers'), end: false },
    { to: '/posts', label: t('nav.posts'), end: false },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      {/* Main bar */}
      <div className="container-app flex h-16 items-center gap-4 sm:h-20">
        <Logo />

        {/* Search — prominent on both mobile and desktop */}
        <div className="mx-auto w-full max-w-xl flex-1 ps-1 sm:ps-4">
          <SearchBar />
        </div>

        {/* Mobile language */}
        <div className="lg:hidden">
          <LanguageSwitcher />
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1 lg:flex">
          <LanguageSwitcher />
          <UserMenu variant="desktop" />
          <WishlistIcon />
          <CartIcon />
        </div>
      </div>

      {/* Mobile scrollable nav pills */}
      <nav className="border-t border-line lg:hidden" aria-label="Main">
        <div className="container-app flex gap-2 overflow-x-auto py-2 no-scrollbar">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? mobileActive : mobileLink)}
            >
              {item.label}
            </NavLink>
          ))}
          {!isAdminRoute && !isMarketerRoute && (user?.role !== 'ADMIN') && (user?.role !== 'MARKETER') && (
            <button
              type="button"
              onClick={become.open}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              <Megaphone size={14} />
              {t('marketer.become')}
            </button>
          )}
        </div>
      </nav>

      {/* Desktop secondary nav */}
      <nav className="hidden border-t border-line lg:block" aria-label="Main">
        <div className="container-app flex h-11 items-center">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? desktopActive : desktopLink)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-4">
            {!isAdminRoute && !isMarketerRoute && (user?.role !== 'ADMIN') && (user?.role !== 'MARKETER') && (
              <button
                type="button"
                onClick={become.open}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                <Megaphone size={15} />
                {t('marketer.become')}
              </button>
            )}
          </div>
        </div>
      </nav>

      <BecomeMarketerPrompt
        open={become.promptOpen}
        busy={become.busy}
        onCancel={() => become.setPromptOpen(false)}
        onConfirm={() => void become.confirmLogoutAndContinue()}
      />
    </header>
  )
}