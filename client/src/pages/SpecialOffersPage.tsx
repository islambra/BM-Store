import { Percent } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import { loadProductsPage } from '../services/catalog'
import ProductCard from '../components/product/ProductCard'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import { ProductCardSkeleton } from '../components/common/Skeletons'

export default function SpecialOffersPage() {
  const { t } = useLanguage()
  const offers = useAsync(() => loadProductsPage({ offer: true, sort: 'popular', limit: 32 }))
  const list = offers.data?.products ?? []

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader
        icon={Percent}
        title={t('nav.deals')}
        subtitle={t('deals.subtitle', { count: offers.data?.total ?? 0 })}
      />

      {offers.loading ? (
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Percent} title={t('common.empty')} description={t('common.noResults')} />
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