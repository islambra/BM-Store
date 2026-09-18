import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ShoppingBag, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { listMyCategories } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Alert, Input, Textarea, Select, Button } from '../../components/common/FormControls'
import ImageUploader from '../../components/common/ImageUploader'
import { formatPrice } from '../common/Price'

interface ProductFormModalProps {
  open: boolean
  onClose: () => void
  product: {
    _id: string
    name: string
    nameAr?: string
    nameFr?: string
    description?: string
    descriptionAr?: string
    descriptionFr?: string
    price: number
    oldPrice?: number
    category: string
    categoryName: string
    images: string[]
    isSpecialOffer: boolean
  } | null
  onSubmit: (data: any) => void
}

export default function ProductFormModal({ open, onClose, product, onSubmit }: ProductFormModalProps) {
  const { t, lang } = useLanguage()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [categories, setCategories] = useState<{ _id: string; slug: string; name: string; nameAr?: string }[]>([])
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    price: 0,
    oldPrice: '',
    category: '',
    isSpecialOffer: false,
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        nameAr: product.nameAr || product.name || '',
        description: product.description || '',
        descriptionAr: product.descriptionAr || product.description || '',
        price: product.price,
        oldPrice: product.oldPrice?.toString() || '',
        category: product.category,
        isSpecialOffer: product.isSpecialOffer,
      })
      setImages((product.images ?? []).filter(Boolean).slice(0, 5))
    } else {
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        price: 0,
        oldPrice: '',
        category: '',
        isSpecialOffer: false,
      })
      setImages([])
    }
  }, [product])

  useEffect(() => {
    if (open) {
      listMyCategories()
        .then((res) => setCategories(res.categories))
        .catch(() => setCategories([]))
    }
  }, [open])

  const fail = (message: string) => {
    setError(message)
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nameAr?.trim()) {
      fail(t('seller.products.nameArRequired'))
      return
    }
    if (!formData.name?.trim()) {
      fail(t('seller.products.nameEnRequired'))
      return
    }
    if (!formData.price || formData.price <= 0) {
      fail(t('seller.products.priceRequired'))
      return
    }
    if (!formData.category) {
      fail(t('seller.products.categoryRequired'))
      return
    }
    if (formData.isSpecialOffer && (!formData.oldPrice || Number(formData.oldPrice) <= formData.price)) {
      fail(t('seller.products.oldPriceRequired'))
      return
    }
    if (images.length === 0) {
      fail(t('seller.products.imageRequired'))
      return
    }

    setLoading(true)
    setError('')

    const data = {
      name: formData.name.trim(),
      nameAr: formData.nameAr.trim(),
      description: formData.description.trim() || undefined,
      descriptionAr: formData.descriptionAr.trim() || undefined,
      price: Number(formData.price),
      oldPrice: formData.isSpecialOffer && Number(formData.oldPrice) > 0 ? Number(formData.oldPrice) : undefined,
      category: formData.category,
      isSpecialOffer: formData.isSpecialOffer,
      image: images[0],
      images: images.slice(0, 5),
    }

    try {
      await onSubmit(data)
      onClose()
    } catch (err) {
      fail(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const priceLabel = formData.isSpecialOffer ? t('admin.product.newPrice') : t('seller.products.price')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-ink-900/50 sm:p-4">
      <div className="flex flex-col w-full max-w-2xl max-h-[min(92vh,calc(100dvh-1.5rem))] overflow-hidden rounded-2xl bg-surface shadow-xl animate-slide-up">
        <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-4 sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ShoppingBag size={18} />
              </span>
              {product ? t('seller.products.edit') : t('seller.products.add')}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {product ? t('seller.products.editDesc') : t('seller.products.addDesc')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn shrink-0 text-ink-400 hover:text-ink-900" aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div ref={bodyRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            {error && (
              <Alert tone="error">
                <span className="inline-flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </span>
              </Alert>
            )}

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
                    onClick={() => setFormData((prev) => ({ ...prev, isSpecialOffer: opt.value }))}
                    className={`rounded-2xl border p-4 text-start transition-all ${
                      formData.isSpecialOffer === opt.value
                        ? 'border-brand-600 bg-brand-50 shadow-sm'
                        : 'border-line bg-surface hover:border-brand-300'
                    }`}
                  >
                    <p className={`text-sm font-bold ${formData.isSpecialOffer === opt.value ? 'text-brand-700' : 'text-ink-900'}`}>
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-ink-700" htmlFor="nameAr">
                  {t('seller.products.nameAr')} *
                </label>
                <Input
                  dir="rtl"
                  id="nameAr"
                  value={formData.nameAr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nameAr: e.target.value }))}
                  placeholder={t('seller.products.nameArPlaceholder')}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700" htmlFor="name">
                  {t('seller.products.nameEnLabel')} *
                </label>
                <Input
                  dir="ltr"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t('seller.products.namePlaceholder')}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700" htmlFor="category">
                  {t('seller.products.category')} *
                </label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="mt-1.5"
                  required
                >
                  <option value="">{t('seller.products.selectCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>{cat.nameAr || cat.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700" htmlFor="price">
                  {priceLabel} *
                </label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value === '' ? 0 : Number(e.target.value) || 0 }))}
                  className="mt-1.5"
                  required
                />
              </div>
              {formData.isSpecialOffer && (
                <div>
                  <label className="block text-sm font-medium text-ink-700" htmlFor="oldPrice">
                    {t('seller.products.oldPrice')} *
                  </label>
                  <Input
                    id="oldPrice"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.oldPrice}
                    onChange={(e) => setFormData((prev) => ({ ...prev, oldPrice: e.target.value }))}
                    placeholder={t('admin.product.oldPricePh')}
                    className="mt-1.5"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-ink-700" htmlFor="descriptionAr">
                  {t('seller.products.descriptionAr')}
                </label>
                <Textarea
                  dir="rtl"
                  id="descriptionAr"
                  rows={3}
                  value={formData.descriptionAr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descriptionAr: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700" htmlFor="description">
                  {t('seller.products.descriptionEnLabel')}
                </label>
                <Textarea
                  dir="ltr"
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1.5"
                  placeholder={t('seller.products.descriptionPlaceholder')}
                />
              </div>
            </div>

            {formData.isSpecialOffer && (() => {
              const price = Number(formData.price)
              const oldPrice = Number(formData.oldPrice)
              const pct = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : null
              return (
                <div className="rounded-2xl border border-accent-100 bg-accent-50/50 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{t('seller.products.oldPrice')}</p>
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
                  {!pct && <p className="mt-2 text-xs text-danger-600">{t('seller.products.oldPriceRequired')}</p>}
                </div>
              )
            })()}

            <div>
              <span className="block text-sm font-medium text-ink-700">
                {t('seller.products.images')} (max 5)
              </span>
              <div className="mt-1.5">
                <ImageUploader
                  multiple
                  max={5}
                  label={t('seller.products.images')}
                  value={images}
                  onChange={(v) => setImages(v as string[])}
                  accept="image/*"
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-line bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}