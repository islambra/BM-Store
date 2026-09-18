import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SlidersHorizontal, PackageSearch, X, AlertCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useCatalog } from '../context/CatalogContext'
import { localizedName } from '../utils/localize'
import { loadProductsPage } from '../services/catalog'
import type { CatalogPage } from '../services/catalog'
import type { ProductFilters } from '../components/product/FilterPanel'
import FilterPanel, { SortSelect, defaultFilters } from '../components/product/FilterPanel'
import ProductCard from '../components/product/ProductCard'
import Breadcrumb from '../components/common/Breadcrumb'
import EmptyState from '../components/common/EmptyState'
import { ProductCardSkeleton } from '../components/common/Skeletons'

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const { categoryBySlug } = useCatalog()

  const [filters, setFilters] = useState<ProductFilters>(() =>
    slug ? { ...defaultFilters, category: slug } : defaultFilters
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState<CatalogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setFilters((prev) => (prev.category === slug ? prev : { ...prev, category: slug }))
  }, [slug])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    loadProductsPage({
      category: slug,
      sort: filters.sort,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      limit: 32,
    })
      .then((p) => {
        if (alive) setPage(p)
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load products')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [slug, filters])

  const category = categoryBySlug(slug)
  const results = page?.products ?? []

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'category' && k !== 'sort' && v !== 0 && v !== false
  ).length

  if (!category && !loading) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <EmptyState
          icon={PackageSearch}
          title={t('category.notFound')}
          description={t('common.noResults')}
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('/categories')}>
              {t('category.title')}
            </button>
          }
        />
      </div>
    )
  }

  const handlePatch = (patch: Partial<ProductFilters>) => setFilters((prev) => ({ ...prev, ...patch }))
  const handleReset = () => setFilters({ ...defaultFilters, category: slug })
  const title = category ? localizedName(category, lang) : ''

  return (
    <div className="container-app pt-6 sm:pt-10">
      <Breadcrumb
        items={[
          { label: t('nav.categories'), to: '/categories' },
          { label: title || slug },
        ]}
      />

      <header className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {t('category.productCount', { count: page?.total ?? 0 })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SortSelect value={filters.sort} onChange={(sort) => handlePatch({ sort })} />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-700 lg:hidden"
          >
            <SlidersHorizontal size={16} />
            {t('common.filter')}
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-2xl border border-line bg-surface p-5">
            <FilterPanel
              filters={filters}
              onChange={handlePatch}
              onReset={handleReset}
              categories={category ? [category] : undefined}
            />
          </div>
        </aside>

        <section>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
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
          ) : results.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={t('common.empty')}
              description={t('common.noResults')}
              action={
                <button type="button" className="btn-primary" onClick={handleReset}>
                  {t('filter.reset')}
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
        <div
          className={`absolute inset-0 bg-ink-900/40 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-5 transition-transform duration-300 ${
            drawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-900/10" />
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">{t('common.filter')}</h2>
            <button type="button" className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label={t('common.close')}>
              <X size={20} />
            </button>
          </div>
          <FilterPanel
            filters={filters}
            onChange={handlePatch}
            onReset={() => {
              handleReset()
              setDrawerOpen(false)
            }}
            categories={category ? [category] : undefined}
          />
          <button type="button" className="btn-primary mt-6 w-full" onClick={() => setDrawerOpen(false)}>
            {t('common.apply')} ({results.length})
          </button>
        </div>
      </div>
    </div>
  )
}