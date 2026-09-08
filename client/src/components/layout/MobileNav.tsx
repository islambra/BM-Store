import { NavLink, useLocation } from 'react-router-dom'
import { Heart, ShoppingCart, User } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useStore } from '../../context/StoreContext'

const items = [
  { to: '/cart', key: 'common.cart', icon: ShoppingCart },
  { to: '/wishlist', key: 'common.wishlist', icon: Heart },
  { to: '/account', key: 'common.account', icon: User },
]

export default function MobileNav() {
  const { t } = useLanguage()
  const { cartCount, wishlistCount } = useStore()
  const location = useLocation()

  const badgeFor = (to: string) => {
    if (to === '/cart') return cartCount
    if (to === '/wishlist') return wishlistCount
    return 0
  }

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto flex max-w-sm items-stretch justify-between px-1.5 pt-1">
        {items.map((item) => {
          const Icon = item.icon
          const badge = badgeFor(item.to)
          const active = isActive(item.to)
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                aria-label={t(item.key)}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center gap-1 pb-1.5 pt-1.5"
              >
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-600" />}
                <span
                  className={`relative flex h-9 w-14 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-brand-50 text-brand-700' : 'text-ink-500'
                  }`}
                >
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                  {badge > 0 && (
                    <span className="absolute -end-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
                      {badge > 99 ? '99' : badge}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] leading-none ${
                    active ? 'font-bold text-brand-700' : 'font-semibold text-ink-500'
                  }`}
                >
                  {t(item.key)}
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}