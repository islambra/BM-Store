import { useEffect, useMemo, useState } from 'react'
import { Banknote, LoaderCircle, XCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import { Field, Input, Select } from '../common/FormControls'
import { formatPrice } from '../common/Price'
import { PayoutStatusBadge } from '../marketer/marketerShared'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

type PayoutListItem = api.MarketerPayoutRecord & { marketer?: { _id: string; name: string; phone?: string } }

export default function PayoutsSection() {
  const { t, lang } = useLanguage()
  const marketers = useAsync(() => api.getAdminMarketers())

  const [filterMarketer, setFilterMarketer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [data, setData] = useState<{ payouts: PayoutListItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [marketerId, setMarketerId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'CCP' | 'BaridiMob'>('CCP')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [cancelling, setCancelling] = useState<PayoutListItem | null>(null)

  const marketerOptions = useMemo(
    () => (marketers.data?.marketers ?? []).map((m) => ({ value: m.id, label: m.profile?.publicName ?? m.name })),
    [marketers.data]
  )

  useEffect(() => {
    if (!marketers.loading && marketerOptions.length > 0 && !marketerId) {
      setMarketerId(marketerOptions[0].value)
    }
  }, [marketers.loading, marketerOptions, marketerId])
  const balanceOf = (id: string) => {
    const m = (marketers.data?.marketers ?? []).find((x) => x.id === id)
    return m?.stats?.availableBalance ?? 0
  }

  const reload = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.getPayouts({ marketer: filterMarketer || undefined, status: filterStatus || undefined }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMarketer, filterStatus])

  if (loading) return <Loader />

  const payouts: PayoutListItem[] = (data?.payouts ?? []) as PayoutListItem[]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setNotice('')
    if (!marketerId || !amount) {
      setErrorMsg(t('common.requiredFields'))
      return
    }
    const value = Number(amount)
    const balance = balanceOf(marketerId)
    if (!Number.isFinite(value) || value <= 0) {
      setErrorMsg(t('admin.payouts.invalidAmount'))
      return
    }
    if (value > balance) {
      setErrorMsg(t('admin.payouts.exceeds'))
      return
    }
    setBusy(true)
    try {
      await api.recordPayout({
        marketerId,
        amount: value,
        method,
        notes: notes.trim() || undefined,
      })
      setNotice(t('admin.payouts.recorded'))
      setAmount('')
      setNotes('')
      void reload()
      void marketers.reload()
    } catch (err) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const cancelPayout = async () => {
    if (!cancelling) return
    setBusy(true)
    setNotice('')
    try {
      await api.updatePayout(String(cancelling._id), 'cancel')
      setCancelling(null)
      setNotice(t('admin.payouts.cancelled'))
      void reload()
      void marketers.reload()
    } catch (err) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <Banknote size={16} className="text-brand-600" />
        {t('admin.payouts.record')}
      </h3>

      <div className="rounded-2xl border border-line bg-canvas p-5">
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-5">
          <Field label={t('admin.payouts.marketer')} required>
            <Select
              value={marketerId}
              onChange={(e) => {
                setMarketerId(e.target.value)
                setErrorMsg('')
              }}
              options={marketerOptions}
              required
              disabled={marketers.loading}
            />
          </Field>
          <Field label={t('admin.payouts.amount')} hint={marketerId ? `${t('admin.payouts.balance')}: ${formatPrice(balanceOf(marketerId), lang)}` : undefined} required>
            <Input dir="ltr" type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0" />
          </Field>
          <Field label={t('admin.payouts.method')}>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as 'CCP' | 'BaridiMob')}
              options={[
                { value: 'CCP', label: 'CCP' },
                { value: 'BaridiMob', label: 'BaridiMob' },
              ]}
            />
          </Field>
          <Field label={t('admin.payouts.notes')}>
            <Input dir="ltr" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('admin.payouts.notesPlaceholder')} />
          </Field>
          <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Banknote size={16} />}
              {t('admin.payouts.recordCta')}
            </button>
            {errorMsg && <ErrorNote message={errorMsg} />}
            {notice && <span className="text-sm font-semibold text-success-600">{notice}</span>}
          </div>
        </form>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Select
            value={filterMarketer}
            onChange={(e) => setFilterMarketer(e.target.value)}
            options={[{ value: '', label: t('admin.payouts.allMarketers') }, ...marketerOptions]}
          />
        </div>
        <div className="w-full max-w-xs">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: '', label: t('admin.payouts.allStatuses') },
              { value: 'sent', label: t('marketer.statusPaymentSent') },
              { value: 'received', label: t('marketer.statusReceived') },
              { value: 'disputed', label: t('marketer.statusDisputed') },
              { value: 'cancelled', label: t('marketer.statusCancelled') },
            ]}
          />
        </div>
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="py-10 text-center">
            <p className="font-bold text-ink-900">{t('admin.payouts.empty')}</p>
            <p className="mt-1 text-sm text-ink-500">{t('admin.payouts.emptyDesc')}</p>
          </div>
        </div>
      ) : (
        <Table
          headers={[t('admin.payouts.marketer'), t('admin.payouts.amount'), t('admin.payouts.method'), t('admin.payouts.status'), t('admin.payouts.date')]}
        >
          {payouts.map((p) => (
            <tr key={p._id} className="hover:bg-canvas">
              <td className="px-4 py-3 font-semibold text-ink-900">{p.marketer?.name ?? '—'}</td>
              <td className="px-4 py-3 font-bold text-ink-900">{formatPrice(p.amount, lang)}</td>
              <td className="px-4 py-3">
                <Badge tone={p.method === 'CCP' ? 'ok' : 'warn'}>{p.method}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <PayoutStatusBadge status={p.status} />
                  {(p.status === 'sent' || p.status === 'disputed') && (
                    <button
                      type="button"
                      onClick={() => setCancelling(p)}
                      className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                      aria-label={t('admin.payouts.cancel')}
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-ink-500">
                {new Date(p.sentAt ?? p.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={t('admin.payouts.cancelTitle')}
        description={t('admin.payouts.cancelDesc')}
        confirmLabel={t('admin.payouts.cancel')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        danger
        onConfirm={() => void cancelPayout()}
        onCancel={() => setCancelling(null)}
      />
    </div>
  )
}