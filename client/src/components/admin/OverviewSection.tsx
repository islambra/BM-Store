import { ClipboardList, Store as StoreIcon, Tags, Users } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import OrderStatusBadge from '../common/OrderStatusBadge'
import { formatPrice } from '../common/Price'

export default function OverviewSection() {
  const { t, lang } = useLanguage()
  const users = useAsync(() => api.getAdminUsers())
  const marketers = useAsync(() => api.getAdminMarketers())
  const products = useAsync(() => api.getAdminProducts())
  const orders = useAsync(() => api.getAdminOrders())

  const stats = [
    { icon: Users, label: t('admin.tabs.users'), value: users.data?.total ?? 0 },
    { icon: StoreIcon, label: t('admin.tabs.marketers'), value: marketers.data?.marketers.length ?? 0 },
    { icon: Tags, label: t('admin.tabs.products'), value: products.data?.total ?? products.data?.products.length ?? 0 },
    { icon: ClipboardList, label: t('admin.tabs.orders'), value: orders.data?.orders.length ?? 0 },
  ]

  const recent = (orders.data?.orders ?? []).slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-5">
            <s.icon size={18} className="text-brand-600" />
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">{s.value.toLocaleString()}</p>
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