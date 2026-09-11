import { useState } from 'react'
import { CheckCircle2, HandCoins, TriangleAlert } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { formatPrice } from '../common/Price'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import { PayoutStatusBadge } from './marketerShared'
import { ErrorNote, Loader } from '../admin/adminShared'

export default function PaymentsSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getMarketerPayments())
  const [action, setAction] = useState<{ payout: api.MarketerPayoutRecord; kind: 'confirm' | 'dispute' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const payouts = data.payouts ?? []

  const runAction = async () => {
    if (!action) return
    setBusy(true)
    setNotice('')
    try {
      if (action.kind === 'confirm') {
        await api.confirmPayoutReceived(String(action.payout._id))
      } else {
        await api.reportPayoutNotReceived(String(action.payout._id))
      }
      setAction(null)
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}
      {payouts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface">
          <EmptyState icon={HandCoins} title={t('marketer.noPayments')} description={t('marketer.noPaymentsDesc')} />
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((p) => (
            <div key={String(p._id)} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-extrabold tracking-tight text-ink-900">{formatPrice(p.amount, lang)}</span>
                  <PayoutStatusBadge status={p.status} />
                </div>
                <span className="text-xs text-ink-400">
                  {t(`marketer.method${p.method === 'CCP' ? 'CCP' : 'BaridiMob'}`)}
                  {p.reference ? ` · ${p.reference}` : ''}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <p dir="ltr" className="text-xs text-ink-400">
                  {new Date(p.sentAt ?? p.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                  {p.notes ? ` · ${p.notes}` : ''}
                </p>
                {p.status === 'sent' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setAction({ payout: p, kind: 'confirm' })} className="btn-primary btn-sm">
                      <CheckCircle2 size={14} />
                      {t('marketer.confirmReceived')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction({ payout: p, kind: 'dispute' })}
                      className="btn-secondary btn-sm text-danger-700"
                    >
                      <TriangleAlert size={14} />
                      {t('marketer.notReceived')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(action)}
        title={action?.kind === 'confirm' ? t('marketer.confirmReceivedTitle') : t('marketer.notReceivedTitle')}
        description={action?.kind === 'confirm' ? t('marketer.confirmReceivedDesc') : t('marketer.notReceivedDesc')}
        confirmLabel={action?.kind === 'confirm' ? t('marketer.confirmReceived') : t('marketer.notReceived')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        danger={action?.kind === 'dispute'}
        onConfirm={() => void runAction()}
        onCancel={() => setAction(null)}
      />
    </div>
  )
}