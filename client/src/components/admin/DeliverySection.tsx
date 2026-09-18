import { useMemo, useState } from 'react'
import { Save, Search, Truck } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Alert, Input } from '../common/FormControls'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

function parsePrice(value: string): number | null {
  if (!/^\d{1,7}$/.test(value.trim())) return null
  const n = Number(value.trim())
  return Number.isInteger(n) && n >= 0 ? n : null
}

export default function DeliverySection() {
  const { t, lang } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminWilayas())
  const [drafts, setDrafts] = useState<Record<string, { price: string; isActive: boolean }>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState('')
  const [query, setQuery] = useState('')

  const refresh = () => {
    setDrafts({})
    void reload()
  }

  const wilayaName = (w: api.WilayaRecord) => (lang === 'ar' ? w.nameAr || w.name : w.name)

  const rows = useMemo(() => {
    const list = data?.wilayas ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (w) => w.code.includes(q) || w.name.toLowerCase().includes(q) || (w.nameAr ?? '').includes(q),
    )
  }, [data, query])

  const setDraft = (code: string, patch: Partial<{ price: string; isActive: boolean }>, base: api.WilayaRecord) => {
    setDrafts((m) => ({
      ...m,
      [code]: { ...(m[code] ?? { price: String(base.deliveryPrice), isActive: base.isActive !== false }), ...patch },
    }))
  }

  const save = async (w: api.WilayaRecord) => {
    const d = drafts[w.code]
    if (!d) return
    const price = parsePrice(d.price)
    if (price === null) {
      setNotice(t('admin.delivery.invalidFee'))
      setSaved('')
      return
    }
    setBusyKey(w.code)
    setNotice('')
    setSaved('')
    try {
      await api.updateWilaya(w.code, { deliveryPrice: price, isActive: d.isActive })
      refresh()
      setSaved(t('admin.delivery.saved'))
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  return (
    <div className="space-y-5">
      <Alert tone="info">
        <span className="flex items-start gap-2">
          <Truck size={16} className="mt-0.5 shrink-0" />
          <span>{t('admin.delivery.note', { fee: data?.defaultPrice ?? 350 })}</span>
        </span>
      </Alert>

      {notice && <ErrorNote message={notice} />}
      {saved && <Alert tone="success">{saved}</Alert>}

      <div className="max-w-xs">
        <Input
          icon={Search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('admin.delivery.search')}
        />
      </div>

      <Table headers={[t('admin.delivery.wilaya'), t('admin.delivery.cost'), t('admin.delivery.active')]}>
        {rows.map((w) => {
          const d = drafts[w.code]
          const price = d?.price ?? String(w.deliveryPrice)
          const isActive = d?.isActive ?? w.isActive !== false
          const dirty = Boolean(d) && (price !== String(w.deliveryPrice) || isActive !== (w.isActive !== false))
          const busy = busyKey === w.code
          return (
            <tr key={w.code} className="hover:bg-canvas">
              <td className="px-4 py-3">
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
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setDraft(w.code, { price: e.target.value }, w)}
                    className="input w-28"
                  />
                  <span className="text-xs font-semibold text-ink-400">DA</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setDraft(w.code, { isActive: !isActive }, w)}
                  aria-pressed={isActive}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${isActive ? 'bg-brand-600' : 'bg-ink-900/15'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </span>
                  <Badge tone={isActive ? 'ok' : 'muted'}>{isActive ? t('common.yes') : t('common.no')}</Badge>
                </button>
              </td>
              <td className="px-4 py-3 text-end">
                <button type="button" onClick={() => void save(w)} disabled={!dirty || busy} className="btn-primary">
                  {busy ? t('common.saving') : <Save size={15} className="inline-block" />}
                </button>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}
