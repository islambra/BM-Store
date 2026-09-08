import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import { Alert, Field, Input, Select, Toggle, Textarea } from '../common/FormControls'
import { formatPrice } from '../common/Price'
import { ErrorNote, Loader } from './adminShared'

type FlagKey = 'isActive' | 'isFeatured' | 'isSpecialOffer' | 'isRewardEligible'

function emptyForm() {
  return {
    name: '',
    nameAr: '',
    nameFr: '',
    description: '',
    descriptionAr: '',
    descriptionFr: '',
    price: '',
    oldPrice: '',
    images: '',
    stock: '0',
    category: '',
    isActive: true,
    isFeatured: false,
    isSpecialOffer: false,
    isRewardEligible: false,
  }
}

export default function ProductsSection() {
  const { t, lang } = useLanguage()
  const [q, setQ] = useState('')
  const [activeSel, setActiveSel] = useState('')
  const { data, loading, error, reload } = useAsync(() =>
    api.getAdminProducts({ q: q || undefined, isActive: activeSel === '' ? undefined : activeSel === 'true' })
  )
  const [deleting, setDeleting] = useState<api.ProductRecord | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<api.ProductRecord | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const categories = useAsync(() => api.getAdminCategories())

  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const id = setTimeout(() => void reload(), 300)
    return () => clearTimeout(id)
  }, [q, activeSel, reload])

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const products = data?.products ?? []

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const toggleFlag = async (p: api.ProductRecord, flag: FlagKey, value: boolean) => {
    setNotice('')
    try {
      await api.toggleAdminProduct(String(p._id), { [flag]: value })
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
      void reload()
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.deleteAdminProduct(String(deleting._id))
      setDeleting(null)
      setNotice(t('admin.productDeleted'))
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setDeleteBusy(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (p: api.ProductRecord) => {
    setEditing(p)
    setForm({
      name: p.name,
      nameAr: p.nameAr ?? '',
      nameFr: p.nameFr ?? '',
      description: p.description ?? '',
      descriptionAr: p.descriptionAr ?? '',
      descriptionFr: p.descriptionFr ?? '',
      price: String(p.price),
      oldPrice: p.oldPrice ? String(p.oldPrice) : '',
      images: (p.images ?? []).join(', '),
      stock: String(p.stock),
      category: p.category,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isSpecialOffer: p.isSpecialOffer ?? false,
      isRewardEligible: p.isRewardEligible,
    })
    setFormError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm())
    setFormError('')
  }

  const submit = async () => {
    const price = Number(form.price)
    const oldPrice = Number(form.oldPrice)
    const stock = Math.max(0, Math.floor(Number(form.stock) || 0))
    const images = form.images
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4)
    if (!form.name.trim() || !form.category || !Number.isFinite(price) || price <= 0) {
      setFormError(t('common.requiredFields'))
      return
    }
    if (form.isSpecialOffer && !(oldPrice > price)) {
      setFormError(t('admin.product.specialOfferRequired'))
      return
    }
    setFormBusy(true)
    setFormError('')
    const body = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || undefined,
      nameFr: form.nameFr.trim() || undefined,
      description: form.description.trim() || undefined,
      descriptionAr: form.descriptionAr.trim() || undefined,
      descriptionFr: form.descriptionFr.trim() || undefined,
      price,
      oldPrice: oldPrice > 0 ? oldPrice : undefined,
      image: images[0],
      images,
      stock,
      category: form.category,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      isSpecialOffer: form.isSpecialOffer,
      isRewardEligible: form.isRewardEligible,
    }
    try {
      if (editing) await api.updateAdminProduct(String(editing._id), body)
      else await api.createAdminProduct(body)
      closeModal()
      void reload()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setFormBusy(false)
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface">
        <EmptyState icon={Search} title={t('admin.empty')} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs sm:w-64">
          <Input icon={Search} placeholder={t('admin.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-44">
          <Select
            value={activeSel}
            onChange={(e) => setActiveSel(e.target.value)}
            options={[
              { value: '', label: t('admin.all') },
              { value: 'true', label: t('admin.onlyActive') },
              { value: 'false', label: t('admin.onlyInactive') },
            ]}
          />
        </div>
        <button type="button" onClick={openCreate} className="btn-primary sm:ms-auto">
          <Plus size={16} />
          {t('admin.newProduct')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[1050px] text-start">
          <thead className="border-b border-line text-start text-xs font-bold uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-3 text-start">{t('admin.name')}</th>
              <th className="px-3 py-3 text-start">{t('admin.categoryName')}</th>
              <th className="px-3 py-3 text-start">{t('admin.price')}</th>
              <th className="px-3 py-3 text-start">{t('admin.stock')}</th>
              <th className="px-3 py-3 text-center">{t('admin.active')}</th>
              <th className="px-3 py-3 text-center">{t('admin.featured')}</th>
              <th className="px-3 py-3 text-center">{t('admin.specialOffer')}</th>
              <th className="px-3 py-3 text-center">{t('admin.rewardEligible')}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {products.map((p) => (
              <tr key={String(p._id)} className="hover:bg-canvas">
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={p.images?.[0] ?? p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    <p className="max-w-[220px] truncate font-semibold text-ink-900">{p.name}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink-500">{p.categoryName ?? p.category}</td>
                <td className="px-3 py-3 font-semibold text-ink-900">{formatPrice(p.price, lang)}</td>
                <td className="px-3 py-3 text-ink-500">{p.stock}</td>
                <td className="px-3 py-3 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={p.isActive} onChange={(v) => void toggleFlag(p, 'isActive', v)} />
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={p.isFeatured} onChange={(v) => void toggleFlag(p, 'isFeatured', v)} />
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={p.isSpecialOffer ?? false} onChange={(v) => void toggleFlag(p, 'isSpecialOffer', v)} />
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex justify-center">
                    <Toggle checked={p.isRewardEligible} onChange={(v) => void toggleFlag(p, 'isRewardEligible', v)} />
                  </div>
                </td>
                <td className="px-3 py-3 text-end">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="icon-btn text-ink-400 hover:bg-brand-50 hover:text-brand-700"
                      aria-label={t('common.edit')}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                      aria-label={t('common.remove')}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/50 backdrop-blur-[2px]" onClick={closeModal} />
          <div className="relative max-h-[88vh] w-full max-w-2xl animate-pop overflow-y-auto rounded-2xl bg-surface p-6 shadow-lift">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                {editing ? <Pencil size={18} className="text-brand-600" /> : <Plus size={18} className="text-brand-600" />}
                {editing ? t('admin.editProduct') : t('admin.newProduct')}
              </h3>
              <button type="button" onClick={closeModal} aria-label={t('common.close')} className="icon-btn text-ink-400">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {formError && <Alert tone="danger">{formError}</Alert>}
              <Field label={t('admin.product.type')}>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    { value: false, label: t('admin.product.normal') },
                    { value: true, label: t('admin.product.offer') },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => set('isSpecialOffer', opt.value)}
                      className={`rounded-xl border px-4 py-3 text-start text-sm font-semibold transition-colors ${
                        form.isSpecialOffer === opt.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-line bg-surface text-ink-700 hover:border-ink-900/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('admin.product.name')} required>
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label={t('admin.product.nameAr')}>
                  <Input dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} />
                </Field>
                <Field label={t('admin.product.nameFr')}>
                  <Input value={form.nameFr} onChange={(e) => set('nameFr', e.target.value)} />
                </Field>
                <Field label={t('admin.categoryName')} required>
                  <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                    <option value="">{t('common.select')}</option>
                    {(categories.data ?? []).map((c) => (
                      <option key={String(c._id)} value={String(c._id)}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label={t('admin.product.description')}>
                <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('admin.product.descriptionAr')}>
                  <Textarea dir="rtl" rows={2} value={form.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} />
                </Field>
                <Field label={t('admin.product.descriptionFr')}>
                  <Textarea rows={2} value={form.descriptionFr} onChange={(e) => set('descriptionFr', e.target.value)} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={form.isSpecialOffer ? t('admin.product.newPrice') : t('admin.product.price')} required>
                  <Input type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} />
                </Field>
                {form.isSpecialOffer && (
                  <Field label={t('admin.product.oldPrice')} required>
                    <Input
                      type="number"
                      min={0}
                      value={form.oldPrice}
                      onChange={(e) => set('oldPrice', e.target.value)}
                      placeholder={t('admin.product.oldPrice')}
                    />
                  </Field>
                )}
                <Field label={t('admin.stock')}>
                  <Input type="number" min={0} value={form.stock} onChange={(e) => set('stock', e.target.value)} />
                </Field>
              </div>

              {form.isSpecialOffer && (() => {
                const price = Number(form.price)
                const oldPrice = Number(form.oldPrice)
                const pct = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : null
                return (
                  <div className="rounded-xl border border-line bg-canvas p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{t('admin.product.oldPrice')}</p>
                        <p className="mt-0.5 font-semibold text-ink-700">
                          {oldPrice > 0 ? formatPrice(oldPrice, lang) : '—'}
                        </p>
                      </div>
                      <span className="text-ink-300">→</span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{t('admin.product.newPrice')}</p>
                        <p className="mt-0.5 font-semibold text-ink-900">{price > 0 ? formatPrice(price, lang) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{t('admin.product.discount')}</p>
                        <p className={`mt-0.5 font-extrabold ${pct ? 'text-accent-600' : 'text-ink-400'}`}>
                          {pct ? `-${pct}%` : '—'}
                        </p>
                      </div>
                    </div>
                    {!pct && <p className="mt-2 text-xs text-danger-600">{t('admin.product.specialOfferRequired')}</p>}
                  </div>
                )
              })()}
              <Field label={t('admin.product.images')}>
                <Input dir="ltr" value={form.images} onChange={(e) => set('images', e.target.value)} placeholder={t('admin.product.images')} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink-700">
                  <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} />
                  {t('admin.active')}
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink-700">
                  <Toggle checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
                  {t('admin.featured')}
                </label>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink-700">
                  <Toggle checked={form.isRewardEligible} onChange={(v) => set('isRewardEligible', v)} />
                  {t('admin.rewardEligible')}
                </label>
              </div>
              <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} disabled={formBusy} className="btn-ghost sm:w-auto">
                  {t('common.cancel')}
                </button>
                <button type="button" onClick={() => void submit()} disabled={formBusy} className="btn-primary sm:w-auto">
                  {editing ? t('admin.editProduct') : t('admin.newProduct')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.deleteProductTitle')}
        description={t('admin.deleteProductDesc')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        busy={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}