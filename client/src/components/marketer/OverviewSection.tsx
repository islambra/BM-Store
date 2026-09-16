import { ClipboardList, CreditCard, Link2, Megaphone, ShoppingBag, UsersRound, Wallet } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { formatPrice } from '../common/Price'
import OrderStatusBadge from '../common/OrderStatusBadge'
import { CopyButton, MarketerStatCard, PayoutStatusBadge } from './marketerShared'
import { ErrorNote, Loader } from '../admin/adminShared'

function EmptyNote({ children }: { children: string }) {
  return <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-400">{children}</p>
}

export default function OverviewSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error } = useAsync(() => api.getMarketerDashboard())

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const { profile, stats, referralLink } = data
  const fmt = (n: number) => formatPrice(n, lang)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Link2 size={16} className="text-brand-600" />
          {t('marketer.referralLink')}
        </h3>
        <p className="mt-1 text-xs text-ink-500">{t('marketer.referralHint', { code: profile.referralCode, commission: '10%' })}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-3">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:flex">
              <Megaphone size={16} />
            </span>
            <code dir="ltr" className="min-w-0 truncate text-sm font-semibold text-ink-900">
              {referralLink}
            </code>
          </div>
          <CopyButton text={referralLink} label={t('marketer.copy')} copiedLabel={t('marketer.copied')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MarketerStatCard icon={Link2} label={t('marketer.visits')} value={String(stats.visits)} />
        <MarketerStatCard icon={UsersRound} label={t('marketer.customers')} value={String(stats.customers)} />
        <MarketerStatCard icon={ShoppingBag} label={t('marketer.attributed')} value={String(stats.orders)} />
        <MarketerStatCard icon={ClipboardList} label={t('marketer.deliveredOrders')} value={String(stats.deliveredOrders)} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MarketerStatCard accent icon={Wallet} label={t('marketer.availableBalance')} value={fmt(stats.availableBalance)} hint={t('marketer.withdrawHint')} />
        <MarketerStatCard icon={Wallet} label={t('marketer.pendingEarnings')} value={fmt(stats.pendingEarnings)} />
        <MarketerStatCard icon={CreditCard} label={t('marketer.payoutRequested')} value={fmt(stats.payoutRequested)} />
        <MarketerStatCard icon={Wallet} label={t('marketer.totalPaid')} value={fmt(stats.totalPaid)} hint={t('marketer.paidHint', { paid: fmt(stats.totalPaid) })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-sm font-bold text-ink-900">{t('marketer.recentOrders')}</h3>
          {data.recentOrders.length === 0 ? (
            <EmptyNote>{t('marketer.noRecentOrders')}</EmptyNote>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{o.orderRef}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={o.status} />
                    <span className="text-sm font-bold text-ink-900">{fmt(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-sm font-bold text-ink-900">{t('marketer.recentPayouts')}</h3>
          {data.recentPayouts.length === 0 ? (
            <EmptyNote>{t('marketer.noPayments')}</EmptyNote>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.recentPayouts.map((p) => (
                <li key={String(p._id)} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{fmt(p.amount)}</p>
                    <p dir="ltr" className="text-xs text-ink-400">
                      {p.method} · {p.reference ?? '—'}
                    </p>
                  </div>
                  <PayoutStatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}