import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Package, Plus, Search, TrendingUp } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { listMyProducts, createMyProduct, updateMyProduct, deleteMyProduct } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'
import { Input, Button } from '../../components/common/FormControls'
import EmptyState from '../../components/common/EmptyState'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import ProductFormModal from './ProductFormModal'
import { CatalogList, CatalogRow, MediaTile, ItemText, PriceRail, RowActions } from './sellerShared'

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
  isSpecialOffer: boolean
  discount: number
  confirmedSales?: number
}

export default function SellerProductsSection() {
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const limit = 10

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await listMyProducts({ page, limit, q: search })
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
  }, [page, search])

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

  const handleModalClose = () => {
    setModalOpen(false)
    setEditingProduct(null)
    fetchProducts()
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader title={t('seller.products.title')} subtitle={t('seller.products.subtitle')} />
          <Button onClick={handleCreate}><Plus size={18} /> {t('seller.products.add')}</Button>
        </div>
        <CatalogList>
          <div className="animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-ink-900/10" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-4 w-1/3 rounded bg-ink-900/10" />
                  <div className="h-3 w-1/4 rounded bg-ink-900/10" />
                </div>
                <div className="h-8 w-20 rounded-lg bg-ink-900/10" />
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
          title={t('seller.products.title')}
          subtitle={t('seller.products.subtitle')}
          badge={total > 0 ? String(total) : undefined}
        />
        <Button onClick={handleCreate}><Plus size={18} /> {t('seller.products.add')}</Button>
      </div>

      <div className="w-full max-w-md">
        <Input
          icon={Search}
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {products.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <EmptyState
            icon={Package}
            title={t('common.empty')}
            description={t('seller.products.noProducts')}
            action={<Button onClick={handleCreate}><Plus size={16} /> {t('seller.products.add')}</Button>}
          />
        </div>
      ) : (
        <>
          <CatalogList>
            {products.map((product) => (
              <CatalogRow key={product._id}>
                <MediaTile
                  src={product.image}
                  alt={product.nameAr || product.name}
                  icon={Package}
                  size="lg"
                />
                <ItemText
                  title={product.nameAr || product.name}
                  secondary={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>{product.categoryName || product.category}</span>
                      {typeof product.confirmedSales === 'number' && product.confirmedSales > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums text-ink-400">
                          <TrendingUp size={12} aria-hidden="true" />
                          {product.confirmedSales} {t('seller.products.sold')}
                        </span>
                      )}
                    </span>
                  }
                />
                <div className="ms-auto flex items-center gap-4">
                  {product.isSpecialOffer && (
                    <span className="badge bg-accent-500/10 text-accent-700">{t('seller.products.typeOffer')}</span>
                  )}
                  <PriceRail
                    price={product.price}
                    oldPrice={product.isSpecialOffer ? product.oldPrice : undefined}
                    lang={lang}
                  />
                  <RowActions
                    onEdit={() => handleEdit(product)}
                    onDelete={() => handleDelete(product)}
                    editLabel={t('common.edit')}
                    deleteLabel={t('common.delete')}
                  />
                </div>
              </CatalogRow>
            ))}
          </CatalogList>

          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas/40 px-5 py-3">
              <p className="text-sm text-ink-500">
                {t('admin.showing')} {(page - 1) * limit + 1} {t('admin.of')} {Math.min(page * limit, total)} ({total} {t('admin.total')})
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  icon={<ChevronLeft size={18} className="rtl:rotate-180" />}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label={t('common.previous')}
                />
                <span className="inline-flex items-center justify-center text-sm font-medium text-ink-700">{page} / {pages}</span>
                <Button
                  type="button"
                  variant="ghost"
                  icon={<ChevronRight size={18} className="rtl:rotate-180" />}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  aria-label={t('common.next')}
                />
              </div>
            </div>
          )}
        </>
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
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
      />
    </div>
  )
}