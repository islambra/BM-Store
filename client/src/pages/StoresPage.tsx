import { useEffect, useState } from 'react'
import { Search, Store, MapPin, Package, Map, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { listPublicStores } from '../services/api'
import { getErrorMessage } from '../services/api'
import { storeVisitUrl } from '../utils/storeUrl'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import { Input } from '../components/common/FormControls'

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
  productCount: number
}

export default function StoresPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<Store[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const limit = 12

  const fetchStores = async () => {
    setLoading(true)
    try {
      const res = await listPublicStores({ page, limit, q: search })
      setStores(res.stores)
      setPages(res.pages)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [page, search])

  if (loading) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <PageHeader icon={Store} title={t('stores.title')} subtitle={t('stores.subtitle')} />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-line bg-surface p-4 h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader icon={Store} title={t('stores.title')} subtitle={t('stores.subtitle')} />

      <div className="mt-6 mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            placeholder={t('stores.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="ps-10"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-danger-100 bg-danger-50 p-4 text-sm text-danger-600">
          {error}
        </div>
      )}

      {stores.length === 0 ? (
        <EmptyState
          icon={Store}
          title={t('stores.noStores')}
          description={t('stores.noStoresDesc')}
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stores.map((store) => (
              <a key={store._id} href={storeVisitUrl(store.slug)} className="group rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand-300 hover:shadow-lg">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-900/5">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-400">
                      <Store size={32} />
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <h3 className="font-semibold text-ink-900 group-hover:text-brand-700 transition-colors line-clamp-1">{store.name}</h3>
                  <p className="text-sm text-ink-500 line-clamp-1">{t('seller.soldBy')} {store.sellerName}</p>
                  <div className="flex items-center gap-2 text-xs text-ink-400">
                    {store.wilaya && (
                      <>
                        <MapPin size={12} />
                        <span>{store.wilaya}{store.city ? `, ${store.city}` : ''}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    <span className="flex items-center gap-1 text-sm font-medium text-ink-700">
                      <Package size={14} />
                      {store.productCount} {t('stores.storeCard.products')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                      <Map size={12} />
                      {t('stores.storeCard.visit')}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="icon-btn disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-ink-700">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="icon-btn disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}