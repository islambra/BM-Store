import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Check } from 'lucide-react'
import type { Product } from '../../types'
import { localizedName } from '../../utils/localize'
import { useLanguage } from '../../context/LanguageContext'
import { useCatalog } from '../../context/CatalogContext'
import { useStore } from '../../context/StoreContext'
import Price, { formatPrice } from '../common/Price'

export default function ProductCard({ product }: { product: Product }) {
  const { lang, t } = useLanguage()
  const { addToCart, toggleWishlist, isWishlisted, cart } = useStore()
  const { localizeCategory } = useCatalog()

  const wished = isWishlisted(product.id)
  const inCart = cart.some((item) => item.product.id === product.id)
  const name = localizedName(product, lang)
  const categoryLabel = localizeCategory(product.categoryName || product.category)

  // Discounts belong to the product's Special Offer status — never to a section (e.g. Best Selling).
  const isOffer = product.isSpecialOffer && product.discount > 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    addToCart(product)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    toggleWishlist(product.id)
  }

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
        isOffer ? 'border-accent-200 hover:border-accent-400' : 'border-line hover:border-brand-200'
      }`}
    >
      {/* Media */}
      <div className="relative aspect-square overflow-hidden bg-canvas">
        <Link
          to={`/product/${product.id}`}
          className="absolute inset-0 block"
          aria-label={name}
          tabIndex={-1}
        >
          <img
            src={product.image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          {/* Scrim that grounds the hover action */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-900/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        {isOffer && (
          <span className="pointer-events-none absolute start-2.5 top-2.5 z-10 inline-flex items-center rounded-full bg-accent-500 px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-[0_2px_10px_rgb(249_115_22/0.5)]">
            −{product.discount}%
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={t('common.wishlist')}
          aria-pressed={wished}
          className={`absolute end-2.5 top-2.5 z-20 flex h-9 w-9 items-center justify-center rounded-full border bg-surface/95 shadow-soft backdrop-blur transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:shadow-focus ${
            wished
              ? 'border-danger-100 text-danger-500'
              : 'border-line/70 text-ink-400 hover:border-danger-100 hover:text-danger-500'
          }`}
        >
          <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
        </button>

        {/* Add to cart — always visible on touch, reveals on desktop hover */}
        <button
          type="button"
          onClick={handleAdd}
          aria-label={t('common.addToCart')}
          className={`absolute end-2.5 bottom-2.5 z-20 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-white shadow-lift transition-all duration-300 focus-visible:outline-none focus-visible:shadow-focus ${
            inCart ? 'bg-success-600' : 'bg-ink-900/90 hover:bg-brand-600'
          } sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100`}
        >
          {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
          {t('common.addToCart')}
        </button>
      </div>

      {/* Body */}
      <Link to={`/product/${product.id}`} className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <span
          className="truncate text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-400 transition-colors group-hover:text-brand-600 rtl:tracking-normal"
          title={categoryLabel}
        >
          {categoryLabel}
        </span>
        <h3 className="line-clamp-2 min-h-[2.5em] font-display text-sm font-semibold leading-snug text-ink-900 transition-colors duration-200 group-hover:text-brand-700">
          {name}
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 pt-1.5">
          <Price value={product.price} compareAt={isOffer ? product.oldPrice : undefined} size="md" />
          {isOffer && (
            <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10.5px] font-bold text-accent-700">
              {t('product.save', { amount: formatPrice(product.oldPrice! - product.price, lang) })}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
