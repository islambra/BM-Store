import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Field, Input } from '../common/FormControls'
import ImageUploader from '../common/ImageUploader'
import ConfirmDialog from '../common/ConfirmDialog'
import { localizedName } from '../../utils/localize'
import { ErrorNote, Loader, Table } from './adminShared'

export default function CategoriesSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminCategories())
  const [form, setForm] = useState({ nameAr: '', image: '' })
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const create = async () => {
    if (!form.nameAr.trim()) return
    setBusy(true)
    setNotice('')
    try {
      await api.createCategory({ nameAr: form.nameAr.trim(), image: form.image.trim() || undefined, active: true })
      setForm({ nameAr: '', image: '' })
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await api.deleteCategory(deleting)
      setDeleting(null)
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Plus size={16} className="text-brand-600" />
          {t('admin.category.create')}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label={t('admin.category.nameAr')} required>
            <Input dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} />
          </Field>
          <Field label={t('admin.category.image')}>
            <ImageUploader label={t('admin.category.image')} value={form.image} onChange={(v) => set('image', v as string)} />
          </Field>
        </div>
        <button type="button" onClick={() => void create()} disabled={busy} className="btn-primary mt-4">
          {busy ? t('common.saving') : t('admin.category.create')}
        </button>
      </div>
      <Table headers={[t('admin.categoryName')]}>
        {(data ?? []).map((c) => (
          <tr key={String(c._id)} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <img src={c.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{localizedName(c, lang)}</p>
                  <p className="truncate text-xs text-ink-400" dir={lang === 'ar' ? 'ltr' : 'rtl'}>
                    {lang === 'ar' ? c.name : c.nameAr}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 text-end">
              <button type="button" onClick={() => setDeleting(String(c._id))} className="icon-btn text-red-700" aria-label={t('common.remove')}>
                <Trash2 size={17} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.deleteCategoryTitle')}
        description={t('admin.deleteCategoryDesc')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}