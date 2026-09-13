import { NavLink } from 'react-router-dom'
import { Heart, MessageSquare, ShoppingCart } from 'lucide-react'
import UserMenu from './UserMenu'
import { useLanguage } from '../../context/LanguageContext'
import { useStore } from '../../context/StoreContext'

const items = [
  { to: '/posts', key: 'nav.posts', icon: MessageSquare },
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
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
      aria-label={t('nav.mobile')}
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-4 items-stretch rounded-[1.6rem] border border-line/80 bg-white/90 shadow-lift backdrop-blur-xl">
        {items.map((item) => {
          const ItemIcon = item.icon
          const badge = badgeFor(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={t(item.key)}
              className="relative flex flex-col items-center gap-0.5 py-2"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-[0_4px_10px_rgb(36_83_224/0.35)]'
                        : 'text-ink-500'
                    }`}
                  >
                    <ItemIcon size={19} strokeWidth={isActive ? 2.4 : 2} />
                    {badge > 0 && (
                      <span className="absolute -end-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                        {badge > 99 ? '99' : badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`max-w-full truncate text-[10px] leading-none ${
                      isActive ? 'font-bold text-brand-700' : 'font-medium text-ink-500'
                    }`}
                  >
                    {t(item.key)}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
        <div className="flex">
          <UserMenu variant="mobile" />
        </div>
      </div>
    </nav>
  )
}