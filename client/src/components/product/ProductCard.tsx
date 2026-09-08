import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Check } from 'lucide-react'
import type { Product } from '../../types'
import { localizedName } from '../../utils/localize'
import { useLanguage } from '../../context/LanguageContext'
import { useCatalog } from '../../context/CatalogContext'
import { useStore } from '../../context/StoreContext'
import Price from '../common/Price'

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
    <Link
      to={`/product/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-canvas">
        {isOffer && (
          <span className="absolute start-3 top-3 z-10 badge bg-accent-500 text-white">-{product.discount}%</span>
        )}
        <img
          src={product.image}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.stock <= 0 && (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/55 text-xs font-bold text-ink-700 backdrop-blur-[1px]">
            {t('product.outOfStock')}
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={t('common.wishlist')}
          className={`absolute end-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-line/60 bg-surface/90 shadow-soft backdrop-blur transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:shadow-focus ${
            wished ? 'text-danger-500' : 'text-ink-500 hover:text-danger-500'
          }`}
        >
          <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
        </button>

        {/* Add to cart — always visible on touch, reveals on desktop hover */}
        {product.stock > 0 && (
          <button
            type="button"
            onClick={handleAdd}
            aria-label={t('common.addToCart')}
            className={`absolute end-3 bottom-3 z-20 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white shadow-lift transition-all duration-300 focus-visible:outline-none focus-visible:shadow-focus ${
              inCart ? 'bg-success-600' : 'bg-ink-900/90 hover:bg-brand-600'
            } sm:translate-y-1.5 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100`}
          >
            {inCart ? <Check size={14} /> : <ShoppingCart size={14} />}
            {t('common.addToCart')}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3.5 sm:p-4">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-400">
          <span className="truncate">{categoryLabel}</span>
        </span>
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-snug text-ink-900 transition-colors group-hover:text-brand-700">
          {name}
        </h3>
        <div className="mt-auto pt-1.5">
          <Price value={product.price} compareAt={isOffer ? product.oldPrice : undefined} size="md" />
          {isOffer && (
            <p className="mt-0.5 text-[11px] font-bold text-accent-600">{t('product.limited')}</p>
          )}
        </div>
      </div>
    </Link>
  )
}