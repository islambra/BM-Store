import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, Pause, Play, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { listMyProducts, createMyProduct, updateMyProduct, deleteMyProduct, toggleMyProductStatus } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { formatPrice } from '../../components/common/Price'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'
import { Input, Select, Button } from '../../components/common/FormControls'
import ProductFormModal from './ProductFormModal'
import ConfirmDialog from '../../components/common/ConfirmDialog'

type Product = {
  _id: string
  name: string
  nameAr?: string
  price: number
  oldPrice?: number
  image: string
  images: string[]
  category: string
  categoryName: string
  stock: number
  isActive: boolean
  isSpecialOffer: boolean
  status: 'active' | 'paused_by_seller' | 'disabled_by_admin'
  discount: number
}

export default function SellerProductsSection() {
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [pausingProduct, setPausingProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const limit = 10

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await listMyProducts({ page, limit, q: search, status: statusFilter })
      setProducts(res.products)
      setTotal(res.total)
      setPages(res.pages)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [page, search, statusFilter])

  useEffect(() => {
    if (error) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error])

  const handleCreate = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  const handleDelete = (product: Product) => {
    setDeletingProduct(product)
  }

  const confirmDelete = async () => {
    if (!deletingProduct) return
    try {
      await deleteMyProduct(deletingProduct._id)
      fetchProducts()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeletingProduct(null)
    }
  }

  const handlePause = (product: Product) => {
    setPausingProduct(product)
  }

  const confirmPause = async () => {
    if (!pausingProduct) return
    try {
      const newStatus = pausingProduct.status === 'active' ? 'paused_by_seller' : 'active'
      await toggleMyProductStatus(pausingProduct._id, { status: newStatus })
      fetchProducts()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPausingProduct(null)
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingProduct(null)
    fetchProducts()
  }

  const filteredProducts = products

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <SectionHeader title={t('seller.products.title')} subtitle={t('seller.products.subtitle')} />
          <Button onClick={handleCreate}><Plus size={18} /> {t('seller.products.add')}</Button>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse flex gap-4 rounded-2xl border border-line bg-surface p-3.5">
            <div className="h-24 w-24 shrink-0 rounded-xl bg-ink-900/10" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 bg-ink-900/10 rounded" />
              <div className="h-3 w-1/2 bg-ink-900/10 rounded" />
              <div className="h-3 w-1/3 bg-ink-900/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title={t('seller.products.title')} subtitle={t('seller.products.subtitle')} />
        <Button onClick={handleCreate}><Plus size={18} /> {t('seller.products.add')}</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="ps-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-48"
        >
          <option value="">{t('admin.all')}</option>
          <option value="active">{t('seller.products.statusActive')}</option>
          <option value="paused_by_seller">{t('seller.products.statusPaused')}</option>
          <option value="disabled_by_admin">{t('seller.products.statusDisabled')}</option>
        </Select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <Package size={48} className="mx-auto text-ink-400" />
          <h3 className="mt-4 text-lg font-semibold text-ink-900">{t('common.empty')}</h3>
          <p className="mt-1 text-ink-500">{t('seller.products.noProducts')}</p>
          <Button className="mt-4" onClick={handleCreate}><Plus size={16} /> {t('seller.products.add')}</Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-ink-900/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.products.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.products.category')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.products.type')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.products.price')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.products.stock')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.products.status')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-ink-900/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={product.image} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                        <div>
                          <p className="font-medium text-ink-900">{product.nameAr || product.name}</p>
                          <p className="text-sm text-ink-500">{product.categoryName || product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700">{product.categoryName || product.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.isSpecialOffer ? 'bg-accent-50 text-accent-600' : 'bg-brand-50 text-brand-600'
                      }`}>
                        {product.isSpecialOffer ? t('seller.products.typeOffer') : t('seller.products.typeNormal')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {formatPrice(product.price, lang)}
                      {product.isSpecialOffer && product.oldPrice && (
                        <span className="ml-2 text-sm line-through text-ink-400">{formatPrice(product.oldPrice, lang)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-700">{product.stock}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        product.status === 'active' ? 'bg-brand-50 text-brand-700' :
                        product.status === 'paused_by_seller' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {product.status === 'active' && t('seller.products.statusActive')}
                        {product.status === 'paused_by_seller' && t('seller.products.statusPaused')}
                        {product.status === 'disabled_by_admin' && t('seller.products.statusDisabled')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="icon-btn text-ink-400 hover:text-brand-600"
                          aria-label={t('common.edit')}
                        >
                          <Edit size={16} />
                        </button>
                        {product.status !== 'disabled_by_admin' && (
                          <button
                            type="button"
                            onClick={() => handlePause(product)}
                            className="icon-btn text-ink-400 hover:text-amber-600"
                            aria-label={product.status === 'active' ? t('seller.products.pause') : t('seller.products.activate')}
                          >
                            {product.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
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

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-line">
              <p className="text-sm text-ink-500">
                {t('admin.showing')} {(page - 1) * limit + 1} {t('admin.of')} {Math.min(page * limit, total)} ({total} {t('admin.total')})
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} icon><ChevronLeft size={16} /></Button>
                <Button variant="ghost" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} icon><ChevronRight size={16} /></Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ProductFormModal
        open={modalOpen}
        onClose={handleModalClose}
        product={editingProduct}
        onSubmit={(data) => {
          if (editingProduct) {
            updateMyProduct(editingProduct._id, data).then(fetchProducts).catch((err) => setError(getErrorMessage(err)))
          } else {
            createMyProduct(data).then(fetchProducts).catch((err) => setError(getErrorMessage(err)))
          }
        }}
      />

      <ConfirmDialog
        open={!!deletingProduct}
        onCancel={() => setDeletingProduct(null)}
        onConfirm={confirmDelete}
        title={t('seller.products.deleteTitle', { name: deletingProduct?.nameAr || deletingProduct?.name || '' })}
        description={t('seller.products.deleteDesc')}
        confirmText={t('common.delete')}
        tone="danger"
      />

      <ConfirmDialog
        open={!!pausingProduct}
        onCancel={() => setPausingProduct(null)}
        onConfirm={confirmPause}
        title={pausingProduct?.status === 'active' ? t('seller.products.pauseTitle') : t('seller.products.activateTitle')}
        description={pausingProduct?.status === 'active' ? t('seller.products.pauseDesc') : t('seller.products.activateDesc')}
        confirmText={pausingProduct?.status === 'active' ? t('seller.products.pause') : t('seller.products.activate')}
        tone={pausingProduct?.status === 'active' ? 'warning' : 'primary'}
      />
    </div>
  )
}