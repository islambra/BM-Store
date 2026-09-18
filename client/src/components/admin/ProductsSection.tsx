import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Search, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import ImageUploader from '../common/ImageUploader'
import { Alert, Field, Input, Select, Textarea } from '../common/FormControls'
import { formatPrice } from '../common/Price'
import { localizedName } from '../../utils/localize'
import { ErrorNote, Loader } from './adminShared'

function emptyForm() {
  return {
    nameAr: '',
    descriptionAr: '',
    price: '',
    oldPrice: '',
    images: [] as string[],
    category: '',
    isSpecialOffer: false,
  }
}

export default function ProductsSection() {
  const { t, lang } = useLanguage()
  const [q, setQ] = useState('')
  const { data, loading, error, reload } = useAsync(() => api.getAdminProducts({ q: q || undefined }))
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
  }, [q, reload])

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const products = data?.products ?? []

  const set = (k: string, v: string | number | boolean | string[]) => setForm((f) => ({ ...f, [k]: v }))

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
      nameAr: p.nameAr ?? '',
      descriptionAr: p.descriptionAr ?? '',
      price: String(p.price),
      oldPrice: p.oldPrice ? String(p.oldPrice) : '',
      images: p.images ?? [],
      category: p.category,
      isSpecialOffer: p.isSpecialOffer ?? false,
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
    const images = (form.images ?? []).filter(Boolean).slice(0, 5)
    if (!form.nameAr.trim() || !form.category || !Number.isFinite(price) || price <= 0) {
      setFormError(t('common.requiredFields'))
      return
    }
    if (form.isSpecialOffer && !(oldPrice > price)) {
      setFormError(t('admin.product.specialOfferRequired'))
      return
    }
    const category = (categories.data ?? []).find((c) => c.slug === form.category)
    setFormBusy(true)
    setFormError('')
    const body = {
      nameAr: form.nameAr.trim(),
      descriptionAr: form.descriptionAr.trim() || undefined,
      price,
      oldPrice: form.isSpecialOffer && oldPrice > 0 ? oldPrice : undefined,
      image: images[0],
      images,
      category: form.category,
      categoryName: category?.name,
      isSpecialOffer: form.isSpecialOffer,
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

  const priceLabel = form.isSpecialOffer ? t('admin.product.newPrice') : t('admin.product.price')

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs sm:w-64">
          <Input icon={Search} placeholder={t('admin.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" onClick={openCreate} className="btn-primary sm:ms-auto">
          <Plus size={16} />
          {t('admin.newProduct')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        {products.length === 0 ? (
          <EmptyState icon={Search} title={t('admin.empty')} />
        ) : (
          <table className="w-full min-w-[720px] text-start">
            <thead className="border-b border-line text-start text-xs font-bold uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-3 py-3 text-start">{t('admin.name')}</th>
                <th className="px-3 py-3 text-start">{t('admin.categoryName')}</th>
                <th className="px-3 py-3 text-start">{t('admin.price')}</th>
                <th className="px-3 py-3 text-center">{t('admin.specialOffer')}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {products.map((p) => (
                <tr key={String(p._id)} className="hover:bg-canvas">
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={p.images?.[0] ?? p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-semibold text-ink-900">{localizedName(p, lang)}</p>
                        <p className="max-w-[220px] truncate text-xs text-ink-400" dir={lang === 'ar' ? 'ltr' : 'rtl'}>
                          {lang === 'ar' ? p.name : p.nameAr}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-ink-500">{p.categoryName ?? p.category}</td>
                  <td className="px-3 py-3 font-semibold text-ink-900">{formatPrice(p.price, lang)}</td>
                  <td className="px-3 py-3 text-center">
                    {p.isSpecialOffer ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-bold text-accent-600">
                        <Tag size={12} />
                        {t('admin.specialOffer')}
                      </span>
                    ) : (
                      <span className="text-ink-300">—</span>
                    )}
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
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/60 backdrop-blur-md" onClick={closeModal} />
          <div className="relative flex max-h-[92vh] w-full max-w-2xl animate-pop flex-col overflow-hidden rounded-3xl bg-surface shadow-lift">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line bg-canvas/60 px-6 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-ink-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    {editing ? <Pencil size={18} /> : <ShoppingBag size={18} />}
                  </span>
                  {editing ? t('admin.editProduct') : t('admin.newProduct')}
                </h3>
                <p className="mt-1 text-xs text-ink-500">
                  {editing ? t('admin.editProductSub') : t('admin.newProductSub')}
                </p>
              </div>
              <button type="button" onClick={closeModal} aria-label={t('common.close')} className="icon-btn text-ink-400">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {formError && <Alert tone="danger">{formError}</Alert>}

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">{t('admin.product.type')}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    { value: false, label: t('admin.product.normal'), sub: t('admin.product.normalSub') },
                    { value: true, label: t('admin.product.offer'), sub: t('admin.product.offerSub') },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => set('isSpecialOffer', opt.value)}
                      className={`rounded-2xl border p-4 text-start transition-all ${
                        form.isSpecialOffer === opt.value
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : 'border-line bg-surface hover:border-ink-900/20'
                      }`}
                    >
                      <p className={`text-sm font-bold ${form.isSpecialOffer === opt.value ? 'text-brand-700' : 'text-ink-900'}`}>
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('admin.product.nameAr')} required>
                  <Input dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} placeholder={t('admin.product.namePhAr')} />
                </Field>
                <Field label={t('admin.categoryName')} required>
                  <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                    <option value="">{t('common.select')}</option>
                    {(categories.data ?? []).map((c) => (
                      <option key={String(c._id)} value={c.slug}>
                        {localizedName(c, lang)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={priceLabel} required>
                  <Input type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} />
                </Field>
                {form.isSpecialOffer && (
                  <Field label={t('admin.product.oldPrice')} required>
                    <Input
                      type="number"
                      min={0}
                      value={form.oldPrice}
                      onChange={(e) => set('oldPrice', e.target.value)}
                      placeholder={t('admin.product.oldPricePh')}
                    />
                  </Field>
                )}
              </div>

              <Field label={t('admin.product.descriptionAr')}>
                <Textarea dir="rtl" rows={2} value={form.descriptionAr} onChange={(e) => set('descriptionAr', e.target.value)} />
              </Field>

              {form.isSpecialOffer && (() => {
                const price = Number(form.price)
                const oldPrice = Number(form.oldPrice)
                const pct = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : null
                return (
                  <div className="rounded-2xl border border-accent-100 bg-accent-50/50 p-4 text-sm">
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

              <Field label={`${t('admin.product.images')} (max 5)`}>
                <ImageUploader
                  multiple
                  max={5}
                  label={t('admin.product.images')}
                  value={form.images}
                  onChange={(v) => set('images', v as string[])}
                />
              </Field>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-line bg-canvas/60 px-6 py-3.5 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} disabled={formBusy} className="btn-ghost sm:w-auto">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={formBusy}
                className="btn-primary sm:w-auto"
              >
                {formBusy ? t('common.saving') : editing ? t('admin.editProduct') : t('admin.newProduct')}
              </button>
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