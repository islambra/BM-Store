import { useMemo, useState } from 'react'
import { Banknote, LoaderCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Field, Input, Select } from '../common/FormControls'
import { formatPrice } from '../common/Price'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

interface PayoutRecord {
  _id: string
  marketer: { _id: string; name: string; email?: string }
  amount: number
  period: string
  method: 'CCP' | 'BaridiMob'
  reference?: string
  status: string
  createdAt: string
}

export default function PayoutsSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getPayouts())
  const marketers = useAsync(() => api.getAdminMarketers())

  const [marketerId, setMarketerId] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState('')
  const [method, setMethod] = useState<'CCP' | 'BaridiMob'>('CCP')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const payouts = useMemo<PayoutRecord[]>(() => (data?.payouts as unknown as PayoutRecord[]) ?? [], [data])
  const marketerOptions = useMemo(
    () => (marketers.data?.marketers ?? []).map((m) => ({ value: m.id, label: m.profile?.publicName ?? m.name })),
    [marketers.data]
  )

  if (loading) return <Loader />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setNotice('')
    if (!marketerId || !amount || !period) {
      setErrorMsg(t('common.requiredFields'))
      return
    }
    setBusy(true)
    try {
      await api.recordPayout({ marketerId, amount: Number(amount), period, method, reference: reference.trim() || undefined })
      setNotice(t('admin.payouts.recorded'))
      setAmount('')
      setReference('')
      void reload()
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
            <Select value={marketerId} onChange={(e) => setMarketerId(e.target.value)} options={marketerOptions} required disabled={marketers.loading} />
          </Field>
          <Field label={t('admin.payouts.amount')} required>
            <Input dir="ltr" type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0" />
          </Field>
          <Field label={t('admin.payouts.period')} required>
            <Input dir="ltr" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
          </Field>
          <Field label={t('admin.payouts.method')}>
            <Select value={method} onChange={(e) => setMethod(e.target.value as 'CCP' | 'BaridiMob')} options={[{ value: 'CCP', label: 'CCP' }, { value: 'BaridiMob', label: 'BaridiMob' }]} />
          </Field>
          <Field label={t('admin.payouts.reference')}>
            <Input dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="—" />
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

      {payouts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface">
          <div className="py-10 text-center">
            <p className="font-bold text-ink-900">{t('admin.payouts.empty')}</p>
            <p className="mt-1 text-sm text-ink-500">{t('admin.payouts.emptyDesc')}</p>
          </div>
        </div>
      ) : (
        <Table
          headers={[t('admin.payouts.marketer'), t('admin.payouts.amount'), t('admin.payouts.period'), t('admin.payouts.method'), t('admin.payouts.reference'), t('admin.payouts.date')]}
        >
          {payouts.map((p) => (
            <tr key={p._id} className="hover:bg-canvas">
              <td className="px-4 py-3 font-semibold text-ink-900">{p.marketer?.name ?? '—'}</td>
              <td className="px-4 py-3 font-bold text-ink-900">{formatPrice(p.amount, lang)}</td>
              <td className="px-4 py-3 font-mono text-xs text-ink-500">{p.period}</td>
              <td className="px-4 py-3">
                <Badge tone={p.method === 'CCP' ? 'ok' : 'warn'}>{p.method}</Badge>
              </td>
              <td className="px-4 py-3 text-ink-500">{p.reference ?? '—'}</td>
              <td className="px-4 py-3 text-ink-500">
                {new Date(p.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}