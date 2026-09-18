import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { getMyEarnings } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { formatPrice } from '../../components/common/Price'
import SectionHeader from '../../components/common/SectionHeader'
import { StatCard } from '../../components/common/StatCard'

export default function SellerEarningsSection() {
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<{
    totalProducts: number
    totalOrders: number
    pendingOrders: number
    deliveredOrders: number
    cancelledOrders: number
    deliveredRevenue: number
    monthlyRevenue: number
  } | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    getMyEarnings()
      .then((res) => {
        if (alive && res.stats) setStats(res.stats)
      })
      .catch((err) => {
        if (alive) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => { alive = false }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.earnings.title')} subtitle={t('seller.earnings.subtitle')} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse h-24 rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-6 py-10 text-center">
        <AlertCircle size={26} className="text-danger-500" />
        <p role="alert" className="text-sm font-medium text-danger-600">{error}</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <DollarSign size={48} className="mx-auto text-ink-400" />
        <h3 className="mt-4 text-lg font-semibold text-ink-900">{t('common.empty')}</h3>
        <p className="mt-1 text-ink-500">{t('seller.earnings.noData')}</p>
      </div>
    )
  }

  const statsCards = [
    {
      label: t('seller.earnings.deliveredRevenue'),
      value: formatPrice(stats.deliveredRevenue, lang),
      icon: DollarSign,
      color: 'brand' as const,
    },
    {
      label: t('seller.earnings.monthlyRevenue'),
      value: formatPrice(stats.monthlyRevenue, lang),
      icon: TrendingUp,
      color: 'green' as const,
    },
    {
      label: t('seller.earnings.totalDeliveredOrders'),
      value: stats.deliveredOrders.toLocaleString(),
      icon: CheckCircle,
      color: 'blue' as const,
    },
    {
      label: t('seller.earnings.totalOrders'),
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'amber' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader title={t('seller.earnings.title')} subtitle={t('seller.earnings.subtitle')} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, i) => (
          <StatCard key={i} label={card.label} value={card.value} icon={card.icon} color={card.color} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-lg font-semibold text-ink-900">{t('seller.earnings.orderBreakdown')}</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-ink-500">{t('seller.earnings.pendingOrders')}</span>
              <span className="font-semibold text-ink-900">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">{t('seller.earnings.deliveredOrders')}</span>
              <span className="font-semibold text-ink-900">{stats.deliveredOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">{t('seller.earnings.cancelledOrders')}</span>
              <span className="font-semibold text-ink-900">{stats.cancelledOrders}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="text-lg font-semibold text-ink-900">{t('seller.earnings.productBreakdown')}</h3>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-ink-500">{t('seller.earnings.totalProducts')}</span>
              <span className="font-semibold text-ink-900">{stats.totalProducts}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-lg font-semibold text-ink-900">{t('seller.earnings.note')}</h3>
        <p className="mt-2 text-sm text-ink-600">
          {t('seller.earnings.noteDesc')}
        </p>
      </div>
    </div>
  )
}