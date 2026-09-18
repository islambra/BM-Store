import { useEffect, useState } from 'react'
import { FolderOpen, Plus, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { listMyCategories, createMyCategory, updateMyCategory, deleteMyCategory } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import SectionHeader from '../../components/common/SectionHeader'
import { Input, Label, Button, Alert } from '../../components/common/FormControls'
import EmptyState from '../../components/common/EmptyState'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import ImageUploader from '../../components/common/ImageUploader'
import { CatalogList, CatalogRow, MediaTile, ItemText, RowActions } from './sellerShared'

type Category = {
  _id: string
  name: string
  nameAr?: string
  slug: string
  image?: string
  icon?: string
  order: number
  active: boolean
  productCount?: number
}

export default function SellerCategoriesSection() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    image: '',
    order: 0,
  })

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await listMyCategories()
      setCategories(res.categories)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCreate = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      nameAr: '',
      image: '',
      order: 0,
    })
    setModalOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      nameAr: category.nameAr || '',
      image: category.image || '',
      order: category.order,
    })
    setModalOpen(true)
  }

  const handleDelete = (category: Category) => {
    setDeletingCategory(category)
  }

  const confirmDelete = async () => {
    if (!deletingCategory) return
    try {
      await deleteMyCategory(deletingCategory._id)
      fetchCategories()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingCategory(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name?.trim() || !formData.nameAr?.trim()) {
      setError(t('seller.categories.nameRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingCategory) {
        await updateMyCategory(editingCategory._id, formData)
      } else {
        await createMyCategory(formData)
      }
      fetchCategories()
      setModalOpen(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader title={t('seller.categories.title')} subtitle={t('seller.categories.subtitle')} />
          <Button onClick={handleCreate}><Plus size={18} /> {t('seller.categories.add')}</Button>
        </div>
        <CatalogList>
          <div className="animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-ink-900/10" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-1/4 rounded bg-ink-900/10" />
                  <div className="h-3 w-1/3 rounded bg-ink-900/10" />
                </div>
                <div className="h-7 w-16 rounded-full bg-ink-900/10" />
              </div>
            ))}
          </div>
        </CatalogList>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title={t('seller.categories.title')}
          subtitle={t('seller.categories.subtitle')}
          badge={categories.length > 0 ? String(categories.length) : undefined}
        />
        <Button onClick={handleCreate}><Plus size={18} /> {t('seller.categories.add')}</Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {categories.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <EmptyState
            icon={FolderOpen}
            title={t('common.empty')}
            description={t('seller.categories.noCategories')}
            action={<Button onClick={handleCreate}><Plus size={16} /> {t('seller.categories.add')}</Button>}
          />
        </div>
      ) : (
        <CatalogList>
          {categories.map((category) => (
            <CatalogRow key={category._id}>
              <MediaTile src={category.image} alt={category.nameAr || category.name} icon={FolderOpen} size="md" />
              <ItemText
                title={category.nameAr || category.name}
                secondary={
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-xs">
                    <span dir="ltr" className="text-ink-400">{category.slug}</span>
                  </span>
                }
              />
              <div className="ms-auto flex items-center gap-4">
                <span className="badge bg-canvas text-ink-500 tabular-nums">
                  {t('seller.categories.productCount', { count: category.productCount ?? 0 })}
                </span>
                <span className={`badge ${
                  category.active ? 'bg-brand-50 text-brand-700' : 'bg-ink-900/5 text-ink-400'
                }`}>
                  {category.active ? t('admin.active') : t('admin.onlyInactive')}
                </span>
                <RowActions
                  onEdit={() => handleEdit(category)}
                  onDelete={() => handleDelete(category)}
                  editLabel={t('common.edit')}
                  deleteLabel={t('common.delete')}
                />
              </div>
            </CatalogRow>
          ))}
        </CatalogList>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50" style={{ display: modalOpen ? 'flex' : 'none' }}>
        <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface shadow-xl animate-slide-up">
          <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3 rounded-t-2xl">
            <h2 className="text-lg font-bold text-ink-900">
              {editingCategory ? t('seller.categories.edit') : t('seller.categories.add')}
            </h2>
            <button type="button" onClick={() => setModalOpen(false)} className="icon-btn text-ink-400 hover:text-ink-900" aria-label={t('common.close')}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && <div className="rounded-xl bg-danger-50 p-3 text-sm text-danger-600">{error}</div>}

            <div>
              <Label htmlFor="nameAr">{t('seller.categories.nameAr')} *</Label>
              <Input
                id="nameAr"
                name="nameAr"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder={t('seller.categories.nameArPlaceholder')}
                required
              />
            </div>

            <div>
              <Label htmlFor="name">{t('seller.categories.nameEnLabel')} *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('seller.categories.namePlaceholder')}
                required
              />
            </div>

            <div>
              <Label htmlFor="image">{t('seller.categories.image')}</Label>
              <ImageUploader
                value={formData.image}
                onChange={(url) => setFormData({ ...formData, image: String(url) })}
                accept="image/*"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-line">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {(() => {
        const titleVal = t('seller.categories.deleteTitle', { name: deletingCategory?.nameAr || deletingCategory?.name || '' })
        const descVal = t('seller.categories.deleteWarning', { count: 0 })
        const title = titleVal ? titleVal : ''
        const description = descVal ? descVal : ''
        return (
          <ConfirmDialog
            open={!!deletingCategory}
            onCancel={() => setDeletingCategory(null)}
            onConfirm={confirmDelete}
            title={title}
            description={description}
            confirmLabel={t('common.delete')}
            cancelLabel={t('common.cancel')}
            danger
          />
        )
      })()}
    </div>
  )
}