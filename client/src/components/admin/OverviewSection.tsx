import { Banknote, CheckCircle2, ClipboardList, Clock3, ShoppingBag, Store as StoreIcon, Tags, Users } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import OrderStatusBadge from '../common/OrderStatusBadge'
import { formatPrice } from '../common/Price'
import { ErrorNote, Loader } from './adminShared'

export default function OverviewSection() {
  const { t, lang } = useLanguage()
  const users = useAsync(() => api.getAdminUsers())
  const marketers = useAsync(() => api.getAdminMarketers())
  const products = useAsync(() => api.getAdminProducts())
  const orders = useAsync(() => api.getAdminOrders())

  const loadError = users.error || marketers.error || products.error || orders.error
  if (loadError) {
    return (
      <div className="space-y-3">
        <ErrorNote message={loadError} />
        <button
          type="button"
          onClick={() => {
            void users.reload()
            void marketers.reload()
            void products.reload()
            void orders.reload()
          }}
          className="btn-ghost"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }
  if (users.loading || marketers.loading || products.loading || orders.loading) return <Loader />

  const adminUsers = users.data?.users ?? []
  const customers = adminUsers.filter((u) => u.role === 'USER').length
  const allOrders = (orders.data?.orders ?? []) as Array<{
    _id: string
    orderRef: string
    total: number
    status: string
    customer: { fullName: string; phone: string }
  }>
  const pending = allOrders.filter((o) => o.status === 'pending-review' || o.status === 'pending').length
  const delivered = allOrders.filter((o) => o.status === 'delivered').length
  const revenue = allOrders.filter((o) => o.status === 'delivered').reduce((sum, o) => sum + (o.total ?? 0), 0)
  const commissionsPending = (marketers.data?.marketers ?? []).reduce(
    (sum, m) => sum + (m.stats?.availableBalance ?? 0) + (m.stats?.pendingEarnings ?? 0),
    0
  )

  const stats = [
    { icon: Users, label: t('admin.statCustomers'), value: customers },
    { icon: StoreIcon, label: t('admin.statMarketers'), value: marketers.data?.marketers.length ?? 0 },
    { icon: Tags, label: t('admin.statProducts'), value: products.data?.total ?? products.data?.products.length ?? 0 },
    { icon: ShoppingBag, label: t('admin.statOrders'), value: allOrders.length },
    { icon: Clock3, label: t('admin.statPending'), value: pending },
    { icon: CheckCircle2, label: t('admin.statDelivered'), value: delivered },
    { icon: Banknote, label: t('admin.statRevenue'), value: formatPrice(revenue, lang) },
    { icon: StoreIcon, label: t('admin.statCommissions'), value: formatPrice(commissionsPending, lang) },
  ]

  const recent = allOrders.slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-5">
            <s.icon size={18} className="text-brand-600" />
            <p className="mt-2 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl" dir="ltr">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <ClipboardList size={16} className="text-brand-600" />
          {t('admin.recentOrders')}
        </h3>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">{t('admin.noOrders')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recent.map((o) => (
              <li key={String(o._id)} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-900">{o.orderRef}</p>
                  <p className="truncate text-xs text-ink-500">
                    {o.customer.fullName} · {o.customer.phone}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={o.status} />
                  <span className="text-sm font-extrabold text-ink-900">{formatPrice(o.total, lang)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}