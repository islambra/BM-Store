import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calendar, Package, PackageSearch, Search, ShoppingBag } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import { getMyOrders, type MyOrderRecord } from '../../services/api'
import { formatPrice } from '../../components/common/Price'
import OrderStatusBadge from '../../components/common/OrderStatusBadge'
import EmptyState from '../../components/common/EmptyState'

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso))
  } catch {
    return ''
  }
}

function OrderCard({ order }: { order: MyOrderRecord }) {
  const { t, lang } = useLanguage()
  const rtl = lang === 'ar'
  const ArrowIcon = rtl ? ArrowLeft : ArrowRight
  const first = order.items[0]
  const extra = order.items.length - 1
  const pct = order.discountPercent ?? 0
  const saved = order.discountAmount ?? order.rewardDiscount ?? 0

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-extrabold tabular-nums text-ink-900" dir="ltr">
          #{order.orderRef}
        </h2>
        <OrderStatusBadge status={order.status} />
        {order.customerOrderNumber != null && (
          <span className="inline-flex items-center rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold tabular-nums text-ink-700">
            {t('client.myOrderNumber')} #{order.customerOrderNumber}
          </span>
        )}
        {pct > 0 ? (
          <span className="inline-flex items-center rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold tabular-nums text-success-700">
            −{pct}%
          </span>
        ) : (
          saved > 0 && (
            <span className="inline-flex items-center rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold text-success-700">
              {t('client.discount')}
            </span>
          )
        )}
        <span className="ms-auto inline-flex items-center gap-1 text-xs text-ink-400">
          <Calendar size={12} />
          {formatDate(order.createdAt, rtl ? 'ar-DZ' : 'en-US')}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-canvas/70 px-3.5 py-3">
        {first?.image ? (
          <img
            src={first.image}
            alt=""
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-xl border border-line object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-brand-600 shadow-sm">
            <Package size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {first ? (
            <p className="truncate text-sm font-semibold text-ink-900">
              {first.name} <span className="font-medium text-ink-400">× {first.qty}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-400">—</p>
          )}
          {extra > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="flex -space-x-2" dir="ltr">
                {order.items.slice(1, 4).map((it, i) =>
                  it.image ? (
                    <img
                      key={`${it.productId}-${i}`}
                      src={it.image}
                      alt=""
                      loading="lazy"
                      className="h-6 w-6 rounded-full border-2 border-surface object-cover"
                    />
                  ) : null,
                )}
              </span>
              <p className="text-xs text-ink-400">+ {extra}</p>
            </div>
          )}
        </div>
        <div className="shrink-0 text-end">
          {saved > 0 && (
            <p className="text-[11px] font-semibold tabular-nums text-success-700">
              −{formatPrice(saved, lang)}
            </p>
          )}
          <p className="text-sm font-extrabold tabular-nums text-ink-900">{formatPrice(order.total, lang)}</p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          to={`/dashboard/orders/${order._id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-[13px] font-bold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          {t('client.viewOrder')}
          <ArrowIcon size={14} />
        </Link>
      </div>
    </article>
  )
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded bg-ink-900/5" />
            <div className="h-6 w-20 rounded-full bg-ink-900/5" />
            <div className="ms-auto h-3 w-20 rounded bg-ink-900/5" />
          </div>
          <div className="mt-3 h-16 rounded-xl bg-ink-900/5" />
        </div>
      ))}
    </div>
  )
}

export default function ClientOrdersPage() {
  const { t } = useLanguage()
  const { data, loading, error } = useAsync(() => getMyOrders())
  const [query, setQuery] = useState('')

  const orders = useMemo(() => data?.orders ?? [], [data])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return orders
    return orders.filter(
      (o) =>
        o.orderRef.toLowerCase().includes(needle) ||
        o.items.some((it) => it.name.toLowerCase().includes(needle)),
    )
  }, [orders, query])

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-xl font-extrabold tracking-tight text-ink-900">{t('client.orders')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('client.ordersSub')}</p>

      {loading ? (
        <div className="mt-5">
          <OrdersSkeleton />
        </div>
      ) : error ? (
        <div className="mt-5 rounded-2xl border border-danger-100 bg-danger-50 p-6 text-center">
          <p className="text-sm font-medium text-danger-600">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-line bg-surface shadow-sm">
          <EmptyState
            icon={ShoppingBag}
            title={t('client.noOrders')}
            description={t('client.noOrdersDesc')}
            action={
              <Link to="/" className="btn-primary inline-flex items-center gap-2">
                <ShoppingBag size={16} />
                {t('client.startShopping')}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="relative mt-5">
            <Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('client.searchOrders')}
              aria-label={t('client.searchOrders')}
              className="input ps-10"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
              <PackageSearch size={28} className="text-ink-300" />
              <p className="mt-3 text-sm font-semibold text-ink-700">{t('common.noResults')}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {filtered.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
