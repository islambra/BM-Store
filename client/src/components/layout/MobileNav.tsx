import { NavLink } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import UserMenu from './UserMenu'
import { useLanguage } from '../../context/LanguageContext'
import { useStore } from '../../context/StoreContext'

const items = [
  { to: '/cart', key: 'common.cart', icon: ShoppingCart },
  { to: '/wishlist', key: 'common.wishlist', icon: Heart },
]

export default function MobileNav() {
  const { t } = useLanguage()
  const { cartCount, wishlistCount } = useStore()

  const badgeFor = (to: string) => {
    if (to === '/cart') return cartCount
    if (to === '/wishlist') return wishlistCount
    return 0
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <ul className="mx-auto flex max-w-sm items-stretch justify-between px-1.5 pt-1">
        {items.map((item) => {
          const ItemIcon = item.icon
          const badge = badgeFor(item.to)
          return (
            <li key={item.to} className="flex-1">
              <NavLink to={item.to} aria-label={t(item.key)} className="relative flex flex-col items-center gap-1 pb-1.5 pt-1.5">
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand-600" />}
                    <span
                      className={`relative flex h-9 w-14 items-center justify-center rounded-full transition-colors ${
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-500'
                      }`}
                    >
                      <ItemIcon size={21} strokeWidth={isActive ? 2.4 : 2} />
                      {badge > 0 && (
                        <span className="absolute -end-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">
                          {badge > 99 ? '99' : badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[10px] leading-none ${
                        isActive ? 'font-bold text-brand-700' : 'font-semibold text-ink-500'
                      }`}
                    >
                      {t(item.key)}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
        <li className="flex-1">
          <UserMenu variant="mobile" />
        </li>
      </ul>
    </nav>
  )
}