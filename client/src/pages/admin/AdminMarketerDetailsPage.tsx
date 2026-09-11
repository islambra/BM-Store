import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, HandCoins, Link2, Megaphone, Wallet } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import { formatPrice } from '../../components/common/Price'
import OrderStatusBadge from '../../components/common/OrderStatusBadge'
import { Badge, ErrorNote, Loader, Panel, Table } from '../../components/admin/adminShared'
import { MarketerStatCard, CommissionStatusBadge, PayoutStatusBadge } from '../../components/marketer/marketerShared'

export default function AdminMarketerDetailsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { t, lang } = useLanguage()
  const detail = useAsync(() => api.getAdminMarketerDetail(id))
  const orders = useAsync(() => api.getAdminMarketerOrders(id))
  const commissions = useAsync(() => api.getAdminMarketerCommissions(id))
  const referrals = useAsync(() => api.getAdminMarketerReferrals(id))
  const payouts = useAsync(() => api.getAdminMarketerPayouts(id))
  const [copiedNow, setCopiedNow] = useState('')

  const fmt = (n: number) => formatPrice(n, lang)

  if (detail.loading) return <Loader />
  if (detail.error) return <ErrorNote message={detail.error} />
  if (!detail.data) return null

  const { profile, stats, referralLink } = detail.data
  const pd = profile.payoutDetails ?? {}

  return (
    <div className="container-app pt-6 sm:pt-10">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft size={15} />
        {t('admin.marketer.back')}
      </Link>
      <PageHeader icon={Megaphone} title={profile.publicName || t('marketer.title')} subtitle={`${t('marketer.referralCode')}: ${profile.referralCode}`} />

      <Panel>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-ink-900">{t('admin.marketer.referralInfo')}</h3>
                <Badge tone={profile.status === 'active' ? 'ok' : 'warn'}>
                  {profile.status === 'active' ? t('marketer.statusActive') : t('marketer.statusSuspended')}
                </Badge>
              </div>
              <p className="text-xs text-ink-500">
                {profile.user?.phone ? `${t('marketer.phone')}: ${profile.user.phone}` : `${t('admin.userId')}: ${profile.user?.id ?? '—'}`}
              </p>
              <p className="text-xs text-ink-400">{t('admin.joined')}: {new Date(profile.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(referralLink)
                setCopiedNow(referralLink)
                setTimeout(() => setCopiedNow(''), 1600)
              }}
              className="btn-secondary btn-sm"
            >
              {copiedNow === referralLink ? t('marketer.copied') : t('marketer.copy')}
            </button>
          </div>
          <code dir="ltr" className="mt-4 block max-w-full truncate rounded-xl border border-line bg-canvas px-4 py-3 text-sm font-semibold text-ink-900">
            {referralLink}
          </code>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MarketerStatCard icon={Link2} label={t('marketer.visits')} value={String(stats.visits)} />
          <MarketerStatCard icon={ClipboardList} label={t('marketer.attributed')} value={String(stats.orders)} />
          <MarketerStatCard icon={Wallet} label={t('marketer.deliveredOrders')} value={String(stats.deliveredOrders)} />
          <MarketerStatCard icon={Wallet} label={t('marketer.totalEarnings')} value={fmt(stats.totalEarnings)} />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MarketerStatCard accent icon={Wallet} label={t('marketer.availableBalance')} value={fmt(stats.availableBalance)} />
          <MarketerStatCard icon={Wallet} label={t('marketer.pendingEarnings')} value={fmt(stats.pendingEarnings)} />
          <MarketerStatCard icon={Wallet} label={t('marketer.paymentSent')} value={fmt(stats.paymentSent)} />
          <MarketerStatCard icon={Wallet} label={t('marketer.totalPaid')} value={fmt(stats.totalPaid)} />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="text-sm font-bold text-ink-900">{t('marketer.payoutDetails')}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-ink-400">{t('marketer.ccp')}</p>
              <p dir="ltr" className="mt-0.5 text-sm font-semibold text-ink-900">{pd.ccp || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-400">{t('marketer.ccpKey')}</p>
              <p dir="ltr" className="mt-0.5 text-sm font-semibold text-ink-900">{pd.ccpKey || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-400">{t('marketer.baridiMob')}</p>
              <p dir="ltr" className="mt-0.5 text-sm font-semibold text-ink-900">{pd.baridiMob || '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <ClipboardList size={16} className="text-brand-600" />
            {t('admin.marketer.orders')}
          </h3>
          {orders.loading ? (
            <Loader />
          ) : orders.error ? (
            <ErrorNote message={orders.error} />
          ) : !orders.data || orders.data.orders.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">{t('marketer.noOrders')}</p>
          ) : (
            <Table headers={[t('marketer.order'), t('common.date'), t('marketer.status'), t('common.total'), t('marketer.orderCommission')]}>
              {orders.data.orders.map((o) => (
                <tr key={o.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-sm font-bold text-ink-900">{o.orderRef}</td>
                  <td className="px-4 py-3 text-xs text-ink-400">{new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 font-semibold text-ink-900">{fmt(o.total)}</td>
                  <td className="px-4 py-3">
                    {o.commission ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">{fmt(o.commission.amount)}</span>
                        <CommissionStatusBadge status={o.commission.status} />
                      </div>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Wallet size={16} className="text-brand-600" />
            {t('admin.marketer.commissions')}
          </h3>
          {commissions.loading ? (
            <Loader />
          ) : commissions.error ? (
            <ErrorNote message={commissions.error} />
          ) : !commissions.data || commissions.data.commissions.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">{t('marketer.noCommissions')}</p>
          ) : (
            <Table headers={[t('marketer.order'), t('common.date'), t('common.total'), t('marketer.orderCommission'), t('marketer.status')]}>
              {commissions.data.commissions.map((c) => (
                <tr key={c._id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-sm font-bold text-ink-900">{c.order?.orderRef ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-ink-400">{new Date(c.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">{c.order ? fmt(c.order.total) : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900">{fmt(c.amount)}</td>
                  <td className="px-4 py-3"><CommissionStatusBadge status={c.status} /></td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Link2 size={16} className="text-brand-600" />
            {t('admin.marketer.referrals')}
          </h3>
          {referrals.loading ? (
            <Loader />
          ) : referrals.error ? (
            <ErrorNote message={referrals.error} />
          ) : !referrals.data || referrals.data.referrals.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">{t('marketer.noRecentOrders')}</p>
          ) : (
            <Table headers={[t('admin.marketer.code'), t('admin.marketer.landing'), t('admin.marketer.converted'), t('admin.marketer.customer'), t('common.date')]}>
              {referrals.data.referrals.map((r) => (
                <tr key={r._id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-mono text-xs uppercase text-brand-700">{r.referralCode}</td>
                  <td dir="ltr" className="px-4 py-3 text-xs text-ink-500">{r.landingPath || '/'}</td>
                  <td className="px-4 py-3">
                    {r.converted ? <Badge tone="ok">{t('admin.marketer.converted')}</Badge> : <Badge tone="muted">—</Badge>}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{r.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-ink-400">{new Date(r.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <HandCoins size={16} className="text-brand-600" />
            {t('admin.marketer.payouts')}
          </h3>
          {payouts.loading ? (
            <Loader />
          ) : payouts.error ? (
            <ErrorNote message={payouts.error} />
          ) : !payouts.data || payouts.data.payouts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">{t('marketer.noPayments')}</p>
          ) : (
            <Table headers={[t('admin.payouts.amount'), t('admin.payouts.method'), t('admin.payouts.reference'), t('admin.payouts.status'), t('admin.payouts.date')]}>
              {payouts.data.payouts.map((p) => (
                <tr key={String(p._id)} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-bold text-ink-900">{fmt(p.amount)}</td>
                  <td className="px-4 py-3"><Badge tone={p.method === 'CCP' ? 'ok' : 'warn'}>{p.method}</Badge></td>
                  <td className="px-4 py-3 text-ink-500">{p.reference ?? '—'}</td>
                  <td className="px-4 py-3"><PayoutStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs text-ink-400">{new Date(p.sentAt ?? p.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Panel>
    </div>
  )
}