import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Phone, Package, Star, Flame, Tag, Search, SlidersHorizontal, ChevronLeft, ChevronRight, AlertCircle, Link2, ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getPublicStore, getErrorMessage, type SellerProductPayload } from '../services/api'
import { localizedName, localizedText } from '../utils/localize'
import { mainSiteUrl, storeUrl, storeVisitUrl, storeDomainSuffix } from '../utils/storeUrl'
import { cn } from '../utils/cn'
import EmptyState from '../components/common/EmptyState'
import SectionHeader from '../components/common/SectionHeader'
import Breadcrumb from '../components/common/Breadcrumb'
import LanguageSwitcher from '../components/common/LanguageSwitcher'
import ProductCard from '../components/product/ProductCard'
import { Input, Select } from '../components/common/FormControls'
import { ProductCardSkeleton } from '../components/common/Skeletons'
import type { Product } from '../types'

type Store = {
  _id: string
  name: string
  slug: string
  logo?: string
  description?: string
  wilaya?: string
  city?: string
  phone?: string
  sellerName: string
  productCount?: number
  status?: string
  subscriptionPlan?: string
  subscriptionEndDate?: string
  isExpired?: boolean
  daysRemaining?: number
  isExpiringSoon?: boolean
}

type Category = {
  _id: string
  slug: string
  name: string
  nameAr?: string
  image?: string
  productCount?: number
}

type TabKey = 'offers' | 'new' | 'best' | 'all'

const toProduct = (p: SellerProductPayload): Product => ({
  ...p,
  id: p._id,
  slug: (p as unknown as { slug?: string }).slug || p._id,
})

export default function StorePage({ slug: hostSlug }: { slug?: string } = {}) {
  const { slug: routeSlug } = useParams()
  const slug = hostSlug ?? routeSlug
  const { t, lang } = useLanguage()
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft

  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<Store | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [specialOffers, setSpecialOffers] = useState<Product[]>([])
  const [newProducts, setNewProducts] = useState<Product[]>([])
  const [bestSelling, setBestSelling] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allProductsPage, setAllProductsPage] = useState(1)
  const [allProductsTotal, setAllProductsTotal] = useState(0)
  const [allProductsPages, setAllProductsPages] = useState(0)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabKey>('offers')
  const [sort, setSort] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const limit = 12

  const fetchStore = async () => {
    setLoading(true)
    setError('')
    try {
      const storeRes = await getPublicStore(slug || '')
      setStore(storeRes.store)
      setCategories(storeRes.categories || [])
      setSpecialOffers(storeRes.specialOffers.map(toProduct))
      setNewProducts(storeRes.newProducts.map(toProduct))
      setBestSelling(storeRes.bestSelling.map(toProduct))
      setAllProducts(storeRes.allProducts.products.map(toProduct))
      setAllProductsPage(storeRes.allProducts.page)
      setAllProductsTotal(storeRes.allProducts.total)
      setAllProductsPages(storeRes.allProducts.pages)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStore()
  }, [slug])

  const fetchAllProducts = async (pageNum = 1) => {
    try {
      const res = await getPublicStore(slug || '', {
        page: pageNum,
        limit,
        category: activeCategory,
        sort,
        q: search,
      })
      setAllProducts(res.allProducts.products.map(toProduct))
      setAllProductsPage(res.allProducts.page)
      setAllProductsTotal(res.allProducts.total)
      setAllProductsPages(res.allProducts.pages)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  useEffect(() => {
    fetchAllProducts(1)
  }, [activeCategory, sort, search])

  if (loading) {
    return (
      <div className="container-app pt-4 sm:pt-6">
        <div className="h-56 rounded-3xl bg-ink-900/5 sm:h-64 lg:h-72" />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-6 py-10 text-center">
          <AlertCircle size={26} className="text-danger-500" />
          <p role="alert" className="text-sm font-medium text-danger-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <EmptyState
          icon={Package}
          title={t('product.notFound')}
          description={t('common.noResults')}
        />
      </div>
    )
  }

  const name = localizedName(store, lang)
  const description = localizedText(store, lang)

  const goBack = () => {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null
      if (referrer && referrer.origin !== window.location.origin) {
        window.location.href = referrer.href
        return
      }
    } catch {
      /* ignore malformed referrer */
    }
    window.location.href = mainSiteUrl('/')
  }

  const tabs: { key: TabKey; label: string; icon: typeof Tag; count: number }[] = [
    { key: 'offers', label: t('seller.store.specialOffers'), icon: Tag, count: specialOffers.length },
    { key: 'new', label: t('seller.store.newProducts'), icon: Star, count: newProducts.length },
    { key: 'best', label: t('seller.store.bestSelling'), icon: Flame, count: bestSelling.length },
    { key: 'all', label: t('seller.store.allProducts'), icon: Package, count: allProductsTotal },
  ]

  const selectCategory = (cat: string) => {
    setActiveCategory(cat)
    setActiveTab('all')
  }

  const grid = 'grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5'

  const renderProducts = (products: Product[], emptyText: string, emptyIcon: typeof Package) => {
    if (products.length === 0) {
      return <EmptyState icon={emptyIcon} title={t('common.empty')} description={emptyText} />
    }
    return (
      <div className={grid}>
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    )
  }

  return (
    <div className="container-app pt-4 sm:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <BackIcon size={16} />
            {t('common.back')}
          </button>
          <Breadcrumb items={[{ label: t('nav.stores'), to: '/stores' }, { label: name }]} />
        </div>
        <LanguageSwitcher />
      </div>

      {/* Store hero */}
      <section className="relative mt-4 overflow-hidden rounded-3xl text-white shadow-lift" aria-label={name}>
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-brand-900 to-brand-600" />
        <div aria-hidden className="pointer-events-none absolute -end-32 -top-32 h-80 w-80 rounded-full bg-brand-400/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -start-32 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/25 backdrop-blur sm:h-24 sm:w-24">
                {store.logo ? (
                  <img src={store.logo} alt={name} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/10 text-white/80">
                    <Package size={34} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">{name}</h1>
                <p className="mt-1.5 text-sm font-medium text-white/70">
                  {t('seller.soldBy')} <span className="font-semibold text-white/90">{store.sellerName}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {store.wilaya && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur">
                  <MapPin size={13} />
                  {store.wilaya}{store.city ? `, ${store.city}` : ''}
                </span>
              )}
              {store.phone && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur">
                  <Phone size={13} />
                  {store.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur">
                <Package size={13} />
                {store.productCount} {t('common.products')}
              </span>
              <a
                href={storeVisitUrl(store.slug)}
                target="_blank"
                rel="noopener noreferrer"
                title={storeUrl(store.slug)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/20"
              >
                <Link2 size={13} />
                <span dir="ltr">{store.slug}{storeDomainSuffix()}</span>
              </a>
            </div>
          </div>

          {description && (
            <div className="mt-6 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15 backdrop-blur sm:mt-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
                {t('store.about')}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{description}</p>
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mt-8 sm:mt-10" aria-label={t('categories.title')}>
          <SectionHeader title={t('categories.title')} />
          <div className="mt-1 flex gap-2.5 overflow-x-auto no-scrollbar pb-1 sm:gap-3">
            <button
              type="button"
              onClick={() => selectCategory('')}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all',
                !activeCategory
                  ? 'border-transparent bg-brand-600 text-white shadow-[0_2px_8px_rgb(36_83_224/0.35)]'
                  : 'border-line bg-surface text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
              )}
            >
              <Package size={15} />
              {t('admin.all')}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-bold',
                  !activeCategory ? 'bg-white/20' : 'bg-ink-900/8'
                )}
              >
                {allProductsTotal}
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => selectCategory(cat.slug)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all',
                  activeCategory === cat.slug
                    ? 'border-transparent bg-brand-600 text-white shadow-[0_2px_8px_rgb(36_83_224/0.35)]'
                    : 'border-line bg-surface text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                )}
              >
                {cat.image && <img src={cat.image} alt="" className="h-5 w-5 rounded object-cover" />}
                {localizedName(cat, lang)}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold',
                    activeCategory === cat.slug ? 'bg-white/20' : 'bg-ink-900/8'
                  )}
                >
                  {cat.productCount || 0}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Segment tabs */}
      <div
        role="tablist"
        aria-label={t('seller.store.allProducts')}
        className="mt-6 flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl border border-line bg-surface p-1.5 sm:mt-8"
      >
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
              activeTab === key
                ? 'bg-brand-600 text-white shadow-[0_2px_10px_rgb(36_83_224/0.3)]'
                : 'text-ink-600 hover:bg-ink-900/5 hover:text-ink-900'
            )}
          >
            <Icon size={16} />
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                activeTab === key ? 'bg-white/20' : 'bg-ink-900/8'
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Product content */}
      <section className="mt-6 sm:mt-8" aria-label={activeTab}>
        {activeTab === 'offers' && renderProducts(specialOffers, t('seller.store.noSpecialOffers'), Tag)}

        {activeTab === 'new' && renderProducts(newProducts, t('seller.store.noNewProducts'), Star)}

        {activeTab === 'best' && renderProducts(bestSelling, t('seller.store.noBestSelling'), Flame)}

        {activeTab === 'all' && (
          <div>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-sm">
                <Input
                  icon={Search}
                  placeholder={t('common.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={t('common.search')}
                />
              </div>
              <div className="flex items-center gap-3">
                {activeCategory && (
                  <span className="hidden items-center gap-1.5 text-sm font-medium text-ink-500 sm:inline-flex">
                    <Package size={14} />
                    {localizedName((categories.find((c) => c.slug === activeCategory) ?? { name: '' }) as Category, lang)}
                  </span>
                )}
                <div className="w-full sm:w-56">
                  <Select
                    icon={SlidersHorizontal}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label={t('filter.sortBy')}
                    options={[
                      { value: '', label: t('filter.sortBy') },
                      { value: 'priceAsc', label: t('sort.priceAsc') },
                      { value: 'priceDesc', label: t('sort.priceDesc') },
                      { value: 'newest', label: t('sort.newest') },
                      { value: 'popular', label: t('sort.popular') },
                    ]}
                  />
                </div>
              </div>
            </div>

            {allProducts.length === 0 ? (
              <EmptyState icon={Package} title={t('common.empty')} description={t('seller.store.noProducts')} />
            ) : (
              <>
                <div className={grid}>
                  {allProducts.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>

                {allProductsPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchAllProducts(allProductsPage - 1)}
                      disabled={allProductsPage === 1}
                      className="icon-btn border border-line bg-surface disabled:opacity-40"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: allProductsPages }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => fetchAllProducts(i + 1)}
                          aria-current={allProductsPage === i + 1 ? 'page' : undefined}
                          className={cn(
                            'inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                            allProductsPage === i + 1
                              ? 'bg-brand-600 text-white shadow-[0_2px_8px_rgb(36_83_224/0.3)]'
                              : 'text-ink-600 hover:bg-ink-900/5 hover:text-ink-900'
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchAllProducts(allProductsPage + 1)}
                      disabled={allProductsPage === allProductsPages}
                      className="icon-btn border border-line bg-surface disabled:opacity-40"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}