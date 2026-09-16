import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { listMyCategories } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Input, Textarea, Select, Label, Button } from '../../components/common/FormControls'
import ImageUploader from '../../components/common/ImageUploader'

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
    stock: number
    images: string[]
    isSpecialOffer: boolean
    status: string
  } | null
  onSubmit: (data: any) => void
}

export default function ProductFormModal({ open, onClose, product, onSubmit }: ProductFormModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [mainImageIndex, setMainImageIndex] = useState(0)
  const [categories, setCategories] = useState<{ _id: string; slug: string; name: string; nameAr?: string }[]>([])
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    nameFr: '',
    description: '',
    descriptionAr: '',
    descriptionFr: '',
    price: 0,
    oldPrice: '',
    category: '',
    stock: 0,
    isSpecialOffer: false,
    status: 'active',
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        nameAr: product.nameAr || '',
        nameFr: product.nameFr || '',
        description: product.description || '',
        descriptionAr: product.descriptionAr || '',
        descriptionFr: product.descriptionFr || '',
        price: product.price,
        oldPrice: product.oldPrice?.toString() || '',
        category: product.category,
        stock: product.stock,
        isSpecialOffer: product.isSpecialOffer,
        status: product.status,
      })
      setImages(product.images || [])
      setMainImageIndex(0)
    } else {
      setFormData({
        name: '',
        nameAr: '',
        nameFr: '',
        description: '',
        descriptionAr: '',
        descriptionFr: '',
        price: 0,
        oldPrice: '',
        category: '',
        stock: 0,
        isSpecialOffer: false,
        status: 'active',
      })
      setImages([])
      setMainImageIndex(0)
    }
  }, [product])

  useEffect(() => {
    if (open) {
      listMyCategories()
        .then((res) => setCategories(res.categories))
        .catch(() => setCategories([]))
    }
  }, [open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: Number(value) || 0 }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    if (mainImageIndex >= index && mainImageIndex > 0) {
      setMainImageIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nameAr?.trim()) {
      setError(t('seller.products.nameArRequired'))
      return
    }
    if (!formData.price || formData.price <= 0) {
      setError(t('seller.products.priceRequired'))
      return
    }
    if (!formData.category) {
      setError(t('seller.products.categoryRequired'))
      return
    }
    if (formData.isSpecialOffer && (!formData.oldPrice || Number(formData.oldPrice) <= formData.price)) {
      setError(t('seller.products.oldPriceRequired'))
      return
    }
    if (images.length === 0) {
      setError(t('seller.products.imageRequired'))
      return
    }

    setLoading(true)
    setError('')

    const data = {
      ...formData,
      images,
      oldPrice: formData.isSpecialOffer && formData.oldPrice ? Number(formData.oldPrice) : undefined,
    }

    try {
      await onSubmit(data)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-xl animate-slide-up">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-ink-900">
              {product ? t('seller.products.edit') : t('seller.products.add')}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {product ? t('seller.products.editDesc') : t('seller.products.addDesc')}
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn text-ink-400 hover:text-ink-900" aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5">
          {error && <div className="rounded-xl bg-danger-50 p-3 text-sm text-danger-600">{error}</div>}

          {/* Media */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">{t('seller.products.media')}</h3>
            <div>
              <Label>{t('seller.products.images')}</Label>
              <div className="mt-2 space-y-3">
                <ImageUploader
                  value={images[mainImageIndex] || ''}
                  onChange={(url) => {
                    const newImages = [...images]
                    newImages[mainImageIndex] = String(url)
                    setImages(newImages)
                  }}
                  accept="image/*"
                />
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((src, i) => (
                      <div key={i} className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden">
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white"
                          aria-label={t('common.remove')}
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMainImageIndex(i)}
                          className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-medium ${
                            mainImageIndex === i ? 'bg-brand-600 text-white' : 'bg-ink-900/50 text-white'
                          }`}
                        >
                          {mainImageIndex === i ? t('seller.products.mainImage') : t('seller.products.setMain')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-ink-500">{t('seller.products.maxImages')}</p>
              </div>
            </div>
          </section>

          {/* Names */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">{t('seller.products.names')}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nameAr">{t('seller.products.nameAr')} *</Label>
                <Input
                  id="nameAr"
                  name="nameAr"
                  value={formData.nameAr}
                  onChange={handleChange}
                  placeholder={t('seller.products.nameArPlaceholder')}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">{t('seller.products.nameEnLabel')}</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('seller.products.namePlaceholder')}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="descriptionAr">{t('seller.products.descriptionAr')}</Label>
                <Textarea
                  id="descriptionAr"
                  name="descriptionAr"
                  value={formData.descriptionAr}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1.5"
                  placeholder={t('seller.products.descriptionArPlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="description">{t('seller.products.descriptionEnLabel')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1.5"
                  placeholder={t('seller.products.descriptionPlaceholder')}
                />
              </div>
            </div>
          </section>

          {/* Pricing & stock */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-400">{t('seller.products.pricing')}</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="price">{t('seller.products.price')} *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.price}
                  onChange={handleChange}
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="stock">{t('seller.products.stock')}</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={handleChange}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="category">{t('seller.products.category')} *</Label>
                <Select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1.5"
                  required
                >
                  <option value="">{t('seller.products.selectCategory')}</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.slug}>{cat.nameAr || cat.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{t('seller.products.typeOffer')}</p>
                  <p className="text-xs text-ink-500">{t('seller.products.typeOfferDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  name="isSpecialOffer"
                  checked={formData.isSpecialOffer}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-line text-brand-600 focus:ring-brand-500"
                />
              </div>
              {formData.isSpecialOffer && (
                <div className="mt-3">
                  <Label htmlFor="oldPrice">{t('seller.products.oldPrice')}</Label>
                  <Input
                    id="oldPrice"
                    name="oldPrice"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.oldPrice}
                    onChange={handleChange}
                    className="mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-ink-500">{t('seller.products.oldPriceHint')}</p>
                </div>
              )}
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
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