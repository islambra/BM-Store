import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Field, Input } from '../common/FormControls'
import ImageUploader from '../common/ImageUploader'
import ConfirmDialog from '../common/ConfirmDialog'
import { ErrorNote, Loader, Table } from './adminShared'

export default function BannersSection() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminBanners())
  const [form, setForm] = useState({ image: '', order: 1 })
  const [deleting, setDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const create = async () => {
    if (!form.image.trim()) return
    setBusy(true)
    setNotice('')
    try {
      await api.createBanner({ image: form.image.trim(), order: form.order, active: true })
      setForm({ image: '', order: 1 })
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
      await api.deleteBanner(deleting)
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
      <Table headers={[t('admin.banner.image'), t('admin.banner.order')]}>
        {(data?.banners ?? []).map((b) => (
          <tr key={String(b._id)} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <img src={b.image} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
            </td>
            <td className="px-4 py-3 text-ink-500">{b.order}</td>
            <td className="px-4 py-3 text-end">
              <button type="button" onClick={() => setDeleting(String(b._id))} className="icon-btn text-red-700" aria-label={t('common.remove')}>
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.banner.image')} required>
            <ImageUploader label={t('admin.banner.image')} value={form.image} onChange={(v) => set('image', v as string)} />
          </Field>
          <Field label={t('admin.banner.order')}>
            <Input type="number" min={1} value={form.order} onChange={(e) => set('order', Number(e.target.value) || 1)} />
          </Field>
        </div>
        <button type="button" onClick={() => void create()} disabled={busy} className="btn-primary mt-4">
          {t('admin.banner.create')}
        </button>
      </div>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.deleteBannerTitle')}
        description={t('admin.deleteBannerDesc')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}