import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Toggle } from '../common/FormControls'
import { ErrorNote, Loader, Table } from './adminShared'

export default function BannersSection() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminBanners())
  const [form, setForm] = useState({ image: '', link: '', order: 1, active: false })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const create = async () => {
    if (!form.image.trim()) return
    setBusy(true)
    setNotice('')
    try {
      await api.createBanner({ image: form.image.trim(), link: form.link.trim() || undefined, order: form.order, active: form.active })
      setForm({ image: '', link: '', order: 1, active: false })
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await api.updateBanner(id, { active })
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  const remove = async (id: string) => {
    try {
      await api.deleteBanner(id)
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const activeCount = data?.activeCount ?? 0
  const max = data?.max ?? 5

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-700">
        {t('admin.banner.activeCount').replace('{count}', String(activeCount)).replace('{max}', String(max))}
      </p>
      {notice && <ErrorNote message={notice} />}
      <Table headers={[t('admin.banner.image'), t('admin.banner.link'), t('admin.banner.order'), t('admin.banner.toggle')]}>
        {(data?.banners ?? []).map((b) => (
          <tr key={String(b._id)} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <img src={b.image} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
            </td>
            <td className="px-4 py-3 font-mono text-xs text-ink-500">{b.link || '—'}</td>
            <td className="px-4 py-3 text-ink-500">{b.order}</td>
            <td className="px-4 py-3">
              <Toggle checked={b.active} onChange={(v) => void toggleActive(String(b._id), v)} />
            </td>
            <td className="px-4 py-3 text-end">
              <button type="button" onClick={() => void remove(String(b._id))} className="icon-btn text-red-700">
                <Trash2 size={17} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Plus size={16} className="text-brand-600" />
          {t('admin.banner.create')}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="input" placeholder={t('admin.banner.image')} value={form.image} onChange={(e) => set('image', e.target.value)} dir="ltr" />
          <input className="input" placeholder={t('admin.banner.link')} value={form.link} onChange={(e) => set('link', e.target.value)} dir="ltr" />
          <input className="input" type="number" placeholder={t('admin.banner.order')} value={form.order} onChange={(e) => set('order', Number(e.target.value) || 1)} />
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm font-medium text-ink-700">
          <Toggle checked={form.active} onChange={(v) => set('active', v)} />
          {t('admin.banner.toggle')}
        </label>
        <button type="button" onClick={() => void create()} disabled={busy} className="btn-primary mt-4">
          {t('admin.banner.create')}
        </button>
      </div>
    </div>
  )
}