import { Link } from 'react-router-dom'
import { Heart, Trash2, AlertCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../context/StoreContext'
import { useAsync } from '../hooks/useAsync'
import { loadProductsByIds } from '../services/catalog'
import ProductCard from '../components/product/ProductCard'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import { ProductCardSkeleton } from '../components/common/Skeletons'

export default function WishlistPage() {
  const { t } = useLanguage()
  const { wishlist, clearWishlist } = useStore()

  const { data: items, loading, error } = useAsync(() => loadProductsByIds(wishlist))

  if (!loading && items?.length === 0 && !error) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <EmptyState
          icon={Heart}
          title={t('wishlist.empty')}
          description={t('wishlist.emptyDesc')}
          action={
            <Link to="/categories" className="btn-primary">
              {t('cart.continue')}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader
        icon={Heart}
        title={t('wishlist.title')}
        subtitle={`${items?.length ?? 0} ${t('wishlist.saved')}`}
        action={
          items && items.length > 0 ? (
            <button
              type="button"
              onClick={() => clearWishlist()}
              className="btn-ghost text-danger-600 hover:text-danger-700"
            >
              <Trash2 size={16} />
              {t('common.clear')}
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="inline-flex items-center gap-2 text-sm text-danger-600">
            <AlertCircle size={16} />
            {error}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {(items ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}