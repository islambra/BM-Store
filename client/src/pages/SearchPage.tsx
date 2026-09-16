import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SlidersHorizontal, PackageSearch, TrendingUp, X, AlertCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { loadProductsPage } from '../services/catalog'
import type { CatalogPage } from '../services/catalog'
import type { ProductFilters } from '../components/product/FilterPanel'
import FilterPanel, { SortSelect, defaultFilters } from '../components/product/FilterPanel'
import ProductCard from '../components/product/ProductCard'
import SearchBar from '../components/common/SearchBar'
import EmptyState from '../components/common/EmptyState'
import { ProductCardSkeleton } from '../components/common/Skeletons'

const suggestionKeys = ['search.chip.saffron', 'search.chip.honey', 'search.chip.argan', 'search.chip.almonds', 'search.chip.oliveOil', 'search.chip.dates']

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const query = params.get('q') ?? ''

  const [filters, setFilters] = useState<ProductFilters>(defaultFilters)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [page, setPage] = useState<CatalogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    loadProductsPage({
      q: query.trim() || undefined,
      sort: filters.sort,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      inStock: filters.inStock || undefined,
      category: filters.category || undefined,
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
  }, [query, filters])

  const results = page?.products ?? []

  const handlePatch = (patch: Partial<ProductFilters>) => setFilters((prev) => ({ ...prev, ...patch }))
  const handleReset = () => setFilters(defaultFilters)

  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'category' && k !== 'sort' && v !== 0 && v !== false).length

  return (
    <div className="container-app pt-6 sm:pt-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-center text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {t('search.title')}
        </h1>
        <SearchBar />
        {!query && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400">
              <TrendingUp size={14} />
              {t('search.suggestions')}
            </span>
            {suggestionKeys.map((key) => {
              const term = t(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(term)}`)}
                  className="rounded-full bg-ink-900/5 px-3.5 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  {term}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          {query ? (
            <>
              {t('search.results', { count: page?.total ?? 0 })}{' '}
              <span className="font-semibold text-ink-900">"{query}"</span>
            </>
          ) : (
            t('category.productCount', { count: page?.total ?? 0 })
          )}
        </p>
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
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-2xl border border-line bg-surface p-5">
            <FilterPanel filters={filters} onChange={handlePatch} onReset={handleReset} />
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
              title={t('common.noResults')}
              description={t('common.empty')}
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
          <FilterPanel filters={filters} onChange={handlePatch} onReset={handleReset} />
          <button type="button" className="btn-primary mt-6 w-full" onClick={() => setDrawerOpen(false)}>
            {t('common.apply')} ({results.length})
          </button>
        </div>
      </div>
    </div>
  )
}