import { Wallet } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { formatPrice } from '../common/Price'
import EmptyState from '../common/EmptyState'
import { CommissionStatusBadge } from './marketerShared'
import { ErrorNote, Loader, Table } from '../admin/adminShared'

export default function EarningsSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error } = useAsync(() => api.getMarketerEarnings())

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const { buckets, commissions } = data
  const fmt = (n: number) => formatPrice(n, lang)

  const rows = [
    { key: 'pendingEarnings', value: buckets.pendingEarnings },
    { key: 'availableBalance', value: buckets.availableBalance },
    { key: 'payoutRequested', value: buckets.payoutRequested },
    { key: 'paymentSent', value: buckets.paymentSent },
    { key: 'totalPaid', value: buckets.totalPaid },
    { key: 'disputed', value: buckets.disputed },
    { key: 'cancelled', value: buckets.cancelled },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-bold text-ink-900">{t('marketer.earnings')}</h3>
        <p className="mt-1 text-xs text-ink-500">{t('marketer.earningsSub')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
            <span className="block text-xs font-semibold text-brand-700">{t('marketer.availableBalance')}</span>
            <span className="mt-1 block text-lg font-extrabold text-brand-900">{fmt(buckets.availableBalance)}</span>
          </div>
          <div className="rounded-xl border border-line px-4 py-3">
            <span className="block text-xs font-semibold text-ink-500">{t('marketer.totalEarnings')}</span>
            <span className="mt-1 block text-lg font-extrabold text-ink-900">{fmt(buckets.totalEarnings)}</span>
          </div>
          <div className="rounded-xl border border-line px-4 py-3">
            <span className="block text-xs font-semibold text-ink-500">{t('marketer.totalPaid')}</span>
            <span className="mt-1 block text-lg font-extrabold text-ink-900">{fmt(buckets.totalPaid)}</span>
          </div>
          <div className="rounded-xl border border-line px-4 py-3">
            <span className="block text-xs font-semibold text-ink-500">{t('marketer.pendingEarnings')}</span>
            <span className="mt-1 block text-lg font-extrabold text-ink-900">{fmt(buckets.pendingEarnings)}</span>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows
            .filter((r) => r.key !== 'pendingEarnings' && r.key !== 'availableBalance')
            .map((r) => (
              <div key={r.key} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5">
                <span className="text-xs font-semibold text-ink-500">{t(`marketer.${r.key}`)}</span>
                <span className="text-sm font-bold text-ink-900">{fmt(r.value)}</span>
              </div>
            ))}
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface">
          <EmptyState icon={Wallet} title={t('marketer.noCommissions')} description={t('marketer.noCommissionsDesc')} />
        </div>
      ) : (
        <Table headers={[t('marketer.order'), t('common.date'), t('common.total'), t('marketer.orderCommission'), t('marketer.status')]}>
          {commissions.map((c) => (
            <tr key={c._id} className="hover:bg-canvas">
              <td className="px-4 py-3 text-sm font-bold text-ink-900">{c.order?.orderRef ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-ink-400">
                {new Date(c.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
              </td>
              <td className="px-4 py-3 font-semibold text-ink-900">{c.order ? formatPrice(c.order.total, lang) : '—'}</td>
              <td className="px-4 py-3 font-semibold text-ink-900">{formatPrice(c.amount, lang)}</td>
              <td className="px-4 py-3">
                <CommissionStatusBadge status={c.status} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}