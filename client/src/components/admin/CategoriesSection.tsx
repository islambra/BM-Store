import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Toggle } from '../common/FormControls'
import { ErrorNote, Loader, Table } from './adminShared'

const iconChoices = ['spices', 'cosmetics', 'baking', 'nuts', 'legumes', 'natural', 'dried', 'oilsHoney']

export default function CategoriesSection() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminCategories())
  const [form, setForm] = useState({ name: '', nameAr: '', nameFr: '', slug: '', icon: 'spices', image: '', order: 1, active: false })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const create = async () => {
    if (!form.name.trim() || !form.slug.trim()) return
    setBusy(true)
    setNotice('')
    try {
      await api.createCategory({ ...form, name: form.name.trim(), slug: form.slug.trim(), image: form.image.trim() })
      setForm({ name: '', nameAr: '', nameFr: '', slug: '', icon: 'spices', image: '', order: 1, active: false })
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await api.updateCategory(id, { active })
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  const remove = async (id: string) => {
    try {
      await api.deleteCategory(id)
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}
      <Table headers={[t('admin.category.create'), t('admin.category.slug'), t('admin.category.active')]}>
        {(data ?? []).map((c) => (
          <tr key={String(c._id)} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <p className="font-semibold text-ink-900">{c.name}</p>
              <p className="text-xs text-ink-500">
                {c.nameAr} · {c.nameFr}
              </p>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-ink-500">{c.slug}</td>
            <td className="px-4 py-3">
              <Toggle checked={c.active} onChange={(v) => void toggleActive(String(c._id), v)} />
            </td>
            <td className="px-4 py-3 text-end">
              <button type="button" onClick={() => void remove(String(c._id))} className="icon-btn text-red-700">
                <Trash2 size={17} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Plus size={16} className="text-brand-600" />
          {t('admin.category.create')}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className="input" placeholder={t('admin.category.name')} value={form.name} onChange={(e) => set('name', e.target.value)} />
          <input className="input" placeholder={t('admin.category.slug')} value={form.slug} onChange={(e) => set('slug', e.target.value)} />
          <input className="input" placeholder={t('admin.category.nameAr')} value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} />
          <input className="input" placeholder={t('admin.category.nameFr')} value={form.nameFr} onChange={(e) => set('nameFr', e.target.value)} />
          <input className="input" placeholder={t('admin.banner.image')} value={form.image} onChange={(e) => set('image', e.target.value)} dir="ltr" />
          <select className="input" value={form.icon} onChange={(e) => set('icon', e.target.value)}>
            {iconChoices.map((ic) => (
              <option key={ic} value={ic}>
                {ic}
              </option>
            ))}
          </select>
          <input className="input" type="number" placeholder={t('admin.category.order')} value={form.order} onChange={(e) => set('order', Number(e.target.value) || 1)} />
        </div>
        <button type="button" onClick={() => void create()} disabled={busy} className="btn-primary mt-4">
          {t('admin.category.create')}
        </button>
      </div>
    </div>
  )
}