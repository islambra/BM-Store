import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Save, Search, Truck } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { getErrorMessage, getMyDelivery, updateMyDeliveryDefault, updateMyWilayaDelivery } from '../../services/api'
import SectionHeader from '../common/SectionHeader'
import { Alert, Input } from '../common/FormControls'

function parsePrice(value: string): number | null {
  if (!/^\d{1,7}$/.test(value.trim())) return null
  const n = Number(value.trim())
  return Number.isInteger(n) && n >= 0 ? n : null
}

export default function SellerDeliverySection() {
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState('')
  const [wilayas, setWilayas] = useState<{ code: string; name: string; nameAr?: string; deliveryPrice: number }[]>([])
  const [defaultPrice, setDefaultPrice] = useState<number | null>(null)
  const [defaultDraft, setDefaultDraft] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const fetchDelivery = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getMyDelivery()
      setDefaultPrice(res.defaultPrice)
      setDefaultDraft(String(res.defaultPrice))
      setWilayas(res.wilayas)
      setDrafts({})
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDelivery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return wilayas
    return wilayas.filter(
      (w) => w.code.includes(q) || w.name.toLowerCase().includes(q) || (w.nameAr ?? '').includes(q),
    )
  }, [wilayas, query])

  const wilayaName = (w: { name: string; nameAr?: string }) => (lang === 'ar' ? w.nameAr || w.name : w.name)

  const saveDefault = async () => {
    if (defaultPrice === null) return
    const price = parsePrice(defaultDraft)
    if (price === null) {
      setNotice(t('seller.delivery.invalidFee'))
      setSaved('')
      return
    }
    setBusyKey('default')
    setNotice('')
    setSaved('')
    try {
      await updateMyDeliveryDefault({ deliveryPrice: price })
      setDefaultPrice(price)
      setDefaultDraft(String(price))
      setSaved(t('seller.delivery.defaultSaved'))
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusyKey(null)
    }
  }

  const saveWilaya = async (w: { code: string; name: string; nameAr?: string; deliveryPrice: number }) => {
    const raw = drafts[w.code]
    if (raw === undefined) return
    const price = parsePrice(raw)
    if (price === null) {
      setNotice(t('seller.delivery.invalidFee'))
      setSaved('')
      return
    }
    setBusyKey(w.code)
    setNotice('')
    setSaved('')
    try {
      await updateMyWilayaDelivery(w.code, { deliveryPrice: price })
      setWilayas((list) => list.map((x) => (x.code === w.code ? { ...x, deliveryPrice: price } : x)))
      setDrafts((m) => {
        const { [w.code]: _omitted, ...rest } = m
        return rest
      })
      setSaved(t('seller.delivery.saved'))
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusyKey(null)
    }
  }

  const busy = busyKey !== null
  const defaultDirty = defaultDraft !== String(defaultPrice)
  const defaultBusy = busyKey === 'default'

  return (
    <div className="space-y-5">
      <SectionHeader title={t('seller.delivery.title')} subtitle={t('seller.delivery.subtitle')} />

      <Alert tone="info">
        <span className="flex items-start gap-2">
          <Truck size={16} className="mt-0.5 shrink-0" />
          <span>{t('seller.delivery.note', { fee: defaultPrice ?? 350 })}</span>
        </span>
      </Alert>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-danger-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-danger-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="text-sm">{notice}</span>
        </div>
      )}
      {saved && <Alert tone="success">{saved}</Alert>}

      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">{t('seller.delivery.defaultLabel')}</p>
            <p className="mt-0.5 text-xs text-ink-500">{t('seller.delivery.defaultHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={defaultDraft}
              onChange={(e) => setDefaultDraft(e.target.value)}
              className="input w-32"
            />
            <span className="text-xs font-semibold text-ink-400">DA</span>
            <button
              type="button"
              onClick={() => void saveDefault()}
              disabled={!defaultDirty || busy}
              className="btn-primary"
            >
              {defaultBusy ? t('common.saving') : <Save size={15} className="inline-block" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xs">
        <Input icon={Search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('seller.delivery.search')} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-900/10" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-500">{t('common.noResults')}</p>
        ) : (
          <table className="w-full text-right">
            <thead className="border-b border-line bg-canvas/60 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">{t('seller.delivery.wilaya')}</th>
                <th className="px-5 py-3">{t('seller.delivery.cost')}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const price = drafts[w.code] ?? String(w.deliveryPrice)
                const dirty = drafts[w.code] !== undefined && price !== String(w.deliveryPrice)
                const busyKeyNow = busyKey === w.code
                return (
                  <tr key={w.code} className="border-b border-line last:border-0 hover:bg-ink-900/[0.03]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-900/5 text-xs font-bold tabular-nums text-ink-700">
                          {w.code}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-900">{wilayaName(w)}</p>
                          <p className="truncate text-xs text-ink-400" dir="ltr">
                            {w.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={price}
                          onChange={(e) => setDrafts((m) => ({ ...m, [w.code]: e.target.value }))}
                          className="input w-28"
                        />
                        <span className="text-xs font-semibold text-ink-400">DA</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => void saveWilaya(w)}
                        disabled={!dirty || busyKeyNow}
                        className="btn-primary"
                      >
                        {busyKeyNow ? t('common.saving') : <Save size={15} className="inline-block" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}