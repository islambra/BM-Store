import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { listMyCategories, createMyCategory, updateMyCategory, deleteMyCategory } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'
import { Input, Label, Button } from '../../components/common/FormControls'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import ImageUploader from '../../components/common/ImageUploader'

type Category = {
  _id: string
  name: string
  nameAr?: string
  slug: string
  image?: string
  icon?: string
  order: number
  active: boolean
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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <SectionHeader title={t('seller.categories.title')} subtitle={t('seller.categories.subtitle')} />
          <Button onClick={handleCreate}><Plus size={18} /> {t('seller.categories.add')}</Button>
        </div>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-ink-900/10" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title={t('seller.categories.title')} subtitle={t('seller.categories.subtitle')} />
        <Button onClick={handleCreate}><Plus size={18} /> {t('seller.categories.add')}</Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <Search size={48} className="mx-auto text-ink-400" />
          <h3 className="mt-4 text-lg font-semibold text-ink-900">{t('common.empty')}</h3>
          <p className="mt-1 text-ink-500">{t('seller.categories.noCategories')}</p>
          <Button className="mt-4" onClick={handleCreate}><Plus size={16} /> {t('seller.categories.add')}</Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-ink-900/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.categories.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.categories.slug')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.categories.order')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.categories.active')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {categories.map((category) => (
                  <tr key={category._id} className="hover:bg-ink-900/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {category.image && (
                          <img src={category.image} alt={category.nameAr || category.name} className="h-10 w-10 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-medium text-ink-900">{category.nameAr || category.name}</p>
                          <p className="text-sm text-ink-500">{category.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700 font-mono">{category.slug}</td>
                    <td className="px-4 py-3 text-sm text-ink-700">{category.order}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        category.active ? 'bg-brand-50 text-brand-700' : 'bg-gray-50 text-gray-600'
                      }`}>
                        {category.active ? t('admin.active') : t('admin.onlyInactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(category)}
                          className="icon-btn text-ink-400 hover:text-brand-600"
                          aria-label={t('common.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          className="icon-btn text-ink-400 hover:text-danger-600"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

            <div>
              <Label htmlFor="order">{t('seller.categories.order')}</Label>
              <Input
                id="order"
                name="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) || 0 })}
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