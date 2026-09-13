import { Trophy } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import { loadProductsPage } from '../services/catalog'
import ProductCard from '../components/product/ProductCard'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import { Alert } from '../components/common/FormControls'
import { ProductCardSkeleton } from '../components/common/Skeletons'

export default function BestSellersPage() {
  const { t } = useLanguage()
  const best = useAsync(() => loadProductsPage({ sort: 'best-selling', limit: 32 }))
  const list = best.data?.products ?? []

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader
        icon={Trophy}
        title={t('nav.bestSellers')}
        subtitle={t('home.bestSellingSub')}
      />

      {best.error ? (
        <div className="mt-7">
          <Alert tone="danger">
            <p>{best.error}</p>
            <button type="button" onClick={() => void best.reload()} className="btn-ghost mt-3">
              {t('common.retry')}
            </button>
          </Alert>
        </div>
      ) : best.loading ? (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Trophy} title={t('common.empty')} description={t('common.noResults')} />
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}