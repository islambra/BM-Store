import { useEffect, useState } from 'react'
import { Package, ShoppingCart, Truck, XCircle, Banknote, ClipboardList, AlertCircle, DollarSign, Clock3 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { getMyEarnings, getMySubscription, listMyOrders } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { formatPrice } from '../../components/common/Price'
import OrderStatusBadge from '../../components/common/OrderStatusBadge'
import EmptyState from '../../components/common/EmptyState'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'

export default function SellerOverviewSection() {
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<{
    totalProducts: number
    activeProducts: number
    pausedProducts: number
    totalOrders: number
    pendingOrders: number
    deliveredOrders: number
    cancelledOrders: number
    deliveredRevenue: number
    monthlyRevenue: number
  } | null>(null)
  const [subscription, setSubscription] = useState<{
    plan: string
    status: string
    startDate: string | null
    endDate: string | null
    daysRemaining: number
    isExpiringSoon: boolean
  } | null>(null)
  const [recentOrders, setRecentOrders] = useState<
    { _id: string; orderRef: string; total: number; status: string; customer: { fullName: string; phone: string } }[]
  >([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    Promise.all([
      getMyEarnings().catch(() => null),
      getMySubscription().catch(() => null),
      listMyOrders({ limit: 5 }).catch(() => null),
    ])
      .then(([earningsRes, subRes, ordersRes]) => {
        if (!alive) return
        if (earningsRes?.stats) setStats(earningsRes.stats)
        if (subRes?.subscription) setSubscription(subRes.subscription)
        if (ordersRes?.orders) setRecentOrders(ordersRes.orders)
      })
      .catch((err) => {
        if (alive) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-6 py-10 text-center">
        <AlertCircle size={26} className="text-danger-500" />
        <p role="alert" className="text-sm font-medium text-danger-600">
          {error}
        </p>
      </div>
    )
  }

  if (!stats) {
    return (
      <EmptyState
        icon={Package}
        title={t('common.empty')}
        description={t('seller.overview.noData')}
      />
    )
  }

  const statCards = [
    { icon: Package, label: t('seller.overview.totalProducts'), value: stats.totalProducts.toLocaleString() },
    { icon: ShoppingCart, label: t('seller.overview.totalOrders'), value: stats.totalOrders.toLocaleString() },
    { icon: Clock3, label: t('seller.overview.pendingOrders'), value: stats.pendingOrders.toLocaleString() },
    { icon: Truck, label: t('seller.overview.deliveredOrders'), value: stats.deliveredOrders.toLocaleString() },
    { icon: XCircle, label: t('seller.overview.cancelledOrders'), value: stats.cancelledOrders.toLocaleString() },
    { icon: Banknote, label: t('seller.overview.deliveredRevenue'), value: formatPrice(stats.deliveredRevenue, lang) },
  ]

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('seller.subscription.active')
      case 'expired': return t('seller.subscription.expired')
      case 'pending': return t('admin.statusPending')
      case 'suspended': return t('admin.statusSuspended')
      default: return status
    }
  }

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'monthly': return t('seller.subscription.monthly')
      case 'yearly': return t('seller.subscription.yearly')
      default: return plan
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats — admin style */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-5">
            <s.icon size={18} className="text-brand-600" />
            <p className="mt-2 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl" dir="ltr">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders — admin style */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <ClipboardList size={16} className="text-brand-600" />
          {t('seller.orders.title')}
        </h3>
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">{t('seller.orders.noOrders')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recentOrders.map((o) => (
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

      {/* Subscription Status */}
      {subscription && (
        <section aria-labelledby="subscription-heading">
          <SectionHeader title={t('seller.subscription.title')} subtitle={t('seller.subscription.status')} />
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-ink-500">{t('seller.subscription.plan')}</p>
                <p className="mt-1 text-lg font-bold text-ink-900">{getPlanLabel(subscription.plan)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-ink-500">{t('seller.subscription.status')}</p>
                <p className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    subscription.status === 'active' ? 'bg-brand-50 text-brand-700' :
                    subscription.status === 'expired' ? 'bg-red-50 text-red-600' :
                    subscription.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {getStatusLabel(subscription.status)}
                  </span>
                  {subscription.isExpiringSoon && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                      <AlertCircle size={12} />
                      {t('seller.subscription.expiringSoon')}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-ink-500">{t('seller.subscription.startDate')}</p>
                <p className="mt-1 text-lg font-bold text-ink-900">
                  {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-ink-500">{t('seller.subscription.endDate')}</p>
                <p className="mt-1 text-lg font-bold text-ink-900">
                  {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US') : '-'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-ink-500">{t('seller.subscription.daysRemaining')}</p>
              <div className="mt-1 flex items-center gap-3">
                <div className="flex-1 h-3 bg-ink-900/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      subscription.daysRemaining <= 7 ? 'bg-red-500' :
                      subscription.daysRemaining <= 30 ? 'bg-amber-500' :
                      'bg-brand-600'
                    }`}
                    style={{ width: `${Math.min(100, (subscription.daysRemaining / 365) * 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-ink-900 whitespace-nowrap">
                  {subscription.daysRemaining} {t('common.days', { count: subscription.daysRemaining })}
                </span>
              </div>
            </div>

            {subscription.isExpiringSoon && (
              <div className="mt-4">
                <Alert tone="warning">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <AlertCircle size={16} />
                    {t('seller.subscription.warning', { days: subscription.daysRemaining })}
                  </span>
                </Alert>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Monthly Revenue */}
      <section aria-labelledby="monthly-revenue-heading">
        <SectionHeader title={t('seller.earnings.monthlyRevenue')} subtitle={formatPrice(stats.monthlyRevenue, lang)} />
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-extrabold text-ink-900">{formatPrice(stats.monthlyRevenue, lang)}</p>
              <p className="text-sm text-ink-500">{t('seller.earnings.thisMonth')}</p>
            </div>
            <DollarSign size={40} className="text-brand-600" />
          </div>
        </div>
      </section>
    </div>
  )
}