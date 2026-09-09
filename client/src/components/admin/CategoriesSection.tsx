import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Field, Input } from '../common/FormControls'
import ImageUploader from '../common/ImageUploader'
import { ErrorNote, Loader, Table } from './adminShared'

export default function CategoriesSection() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminCategories())
  const [form, setForm] = useState({ name: '', nameAr: '', image: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const create = async () => {
    if (!form.name.trim()) return
    setBusy(true)
    setNotice('')
    try {
      await api.createCategory({ name: form.name.trim(), nameAr: form.nameAr.trim() || undefined, image: form.image.trim() || undefined, active: true })
      setForm({ name: '', nameAr: '', image: '' })
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
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
      <Table headers={[t('admin.category.name'), t('admin.category.nameAr')]}>
        {(data ?? []).map((c) => (
          <tr key={String(c._id)} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <img src={c.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <p className="font-semibold text-ink-900">{c.name}</p>
              </div>
            </td>
            <td className="px-4 py-3 text-ink-500">{c.nameAr}</td>
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
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label={t('admin.category.name')} required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label={t('admin.category.nameAr')}>
            <Input dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} />
          </Field>
          <Field label={t('admin.category.image')}>
            <ImageUploader label={t('admin.category.image')} value={form.image} onChange={(v) => set('image', v as string)} />
          </Field>
        </div>
        <button type="button" onClick={() => void create()} disabled={busy} className="btn-primary mt-4">
          {t('admin.category.create')}
        </button>
      </div>
    </div>
  )
}