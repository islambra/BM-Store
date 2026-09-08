import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, ShieldCheck, Truck, BadgeCheck, Headphones, AlertCircle, PackageOpen } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import { loadOffers, loadBestSellers } from '../services/catalog'
import type { Product } from '../types'
import ProductCard from '../components/product/ProductCard'
import SectionHeader from '../components/common/SectionHeader'
import HeroSlider from '../components/home/HeroSlider'
import { ProductCardSkeleton } from '../components/common/Skeletons'
import EmptyState from '../components/common/EmptyState'

const trust = [
  { key: 'trust.secure', keyDesc: 'trust.secureDesc', icon: ShieldCheck },
  { key: 'trust.delivery', keyDesc: 'trust.deliveryDesc', icon: Truck },
  { key: 'trust.quality', keyDesc: 'trust.qualityDesc', icon: BadgeCheck },
  { key: 'trust.support', keyDesc: 'trust.supportDesc', icon: Headphones },
]

function ProductGrid({
  products,
  loading,
  emptyTitle,
}: {
  products: Product[]
  loading: boolean
  emptyTitle: string
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  if (products.length === 0) return <EmptyState icon={PackageOpen} title={emptyTitle} />
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}

export default function Home() {
  const { t, lang } = useLanguage()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

  const bestSelling = useAsync(() => loadBestSellers(4))
  const offers = useAsync(() => loadOffers(4))

  const ViewAll = (to: string) => (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
    >
      {t('common.viewAll')}
      <ArrowIcon size={16} />
    </Link>
  )

  return (
    <div className="container-app pt-4 sm:pt-6">
      {/* Promotional slider */}
      <section aria-label="Promotions">
        <HeroSlider />
      </section>

      {/* Offers */}
      <section className="mt-11 sm:mt-14" aria-label={t('home.offers')}>
        <SectionHeader
          title={t('home.offers')}
          subtitle={t('home.offersSub')}
          badge={t('nav.deals')}
          accent
          action={ViewAll('/special-offers')}
        />
        <ProductGrid products={offers.data ?? []} loading={offers.loading} emptyTitle={t('common.empty')} />
        {offers.error && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-danger-600">
            <AlertCircle size={16} />
            {offers.error}
          </p>
        )}
      </section>

      {/* Best selling */}
      <section className="mt-11 sm:mt-14" aria-label={t('home.bestSelling')}>
        <SectionHeader
          title={t('home.bestSelling')}
          subtitle={t('home.bestSellingSub')}
          action={ViewAll('/best-sellers')}
        />
        <ProductGrid products={bestSelling.data ?? []} loading={bestSelling.loading} emptyTitle={t('common.empty')} />
        {bestSelling.error && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-danger-600">
            <AlertCircle size={16} />
            {bestSelling.error}
          </p>
        )}
      </section>

      {/* Trust / service */}
      <section
        className="mt-12 overflow-hidden rounded-3xl border border-line bg-surface sm:mt-14"
        aria-label={t('home.services')}
      >
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.key} className="flex items-start gap-3 p-5 sm:p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon size={22} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink-900">{t(item.key)}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{t(item.keyDesc)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mt-14 pb-2" />
    </div>
  )
}