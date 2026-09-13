import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import {
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Check,
  PackageX,
  LogIn,
  AlertCircle,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useCatalog } from '../context/CatalogContext'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { localizedName, localizedText } from '../utils/localize'
import { loadProduct, loadProductsPage } from '../services/catalog'
import { getErrorMessage } from '../services/api'
import type { Product } from '../types'
import ProductCard from '../components/product/ProductCard'
import Price, { formatPrice } from '../components/common/Price'
import Breadcrumb from '../components/common/Breadcrumb'
import EmptyState from '../components/common/EmptyState'
import { Alert } from '../components/common/FormControls'
import { ProductCardSkeleton } from '../components/common/Skeletons'

export default function ProductPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const { categoryBySlug, localizeCategory } = useCatalog()
  const { addToCart, toggleWishlist, isWishlisted } = useStore()
  const { user } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [related, setRelated] = useState<Product[]>([])
  const [qty, setQty] = useState(1)
  const [mainImage, setMainImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [loginNotice, setLoginNotice] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setNotFound(false)
    setLoadError('')
    setProduct(null)
    setMainImage(0)
    setQty(1)
    setAdded(false)
    loadProduct(id)
      .then((p) => {
        if (!alive) return
        setProduct(p)
        return loadProductsPage({ category: p.category, limit: 5, sort: 'best-selling' })
          .then((pg) => {
            if (alive) setRelated(pg.products.filter((x) => x.id !== p.id).slice(0, 4))
          })
          .catch(() => undefined)
      })
      .catch((err) => {
        if (!alive) return
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true)
        } else {
          setLoadError(getErrorMessage(err))
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id, reloadNonce])

  if (loading) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse rounded-3xl bg-ink-900/10" />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-6 py-10 text-center">
          <AlertCircle size={26} className="text-danger-500" />
          <p role="alert" className="text-sm font-medium text-danger-600">
            {loadError}
          </p>
          <button type="button" className="btn-primary mt-2" onClick={() => setReloadNonce((n) => n + 1)}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (notFound || !product) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <EmptyState
          icon={PackageX}
          title={t('product.notFound')}
          description={t('common.noResults')}
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('/categories')}>
              {t('nav.categories')}
            </button>
          }
        />
      </div>
    )
  }

  const category = categoryBySlug(product.category)
  const wished = isWishlisted(product.id)
  const name = localizedName(product, lang)
  const description = localizedText(product, lang)

  const handleAdd = () => {
    addToCart(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  const handleBuyNow = () => {
    addToCart(product, qty)
    if (!user) {
      setLoginNotice(true)
      return
    }
    navigate('/checkout')
  }

  return (
    <div className="container-app pt-4 sm:pt-6">
      <Breadcrumb
        items={[
          { label: t('nav.categories'), to: '/categories' },
          ...(category ? [{ label: localizedName(category, lang), to: `/category/${category.slug}` }] : []),
          { label: name },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Gallery */}
        <div>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
            {product.isSpecialOffer && product.discount > 0 && (
              <span className="absolute start-4 top-4 z-10 badge bg-accent-500 text-white">
                -{product.discount}%
              </span>
            )}
            <div className="aspect-square lg:aspect-[4/3]">
              <img
                src={product.images[mainImage] ?? product.image}
                alt={name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          {product.images.length > 1 && (
            <div className="mt-2.5 flex gap-3 overflow-x-auto no-scrollbar">
              {product.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMainImage(i)}
                  aria-label={t('product.imageLabel', { index: i + 1 })}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    mainImage === i ? 'border-brand-600' : 'border-transparent hover:border-ink-900/20'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
            {category ? (
              <button type="button" onClick={() => navigate(`/category/${category.slug}`)} className="hover:underline">
                {localizedName(category, lang)}
              </button>
            ) : (
              localizeCategory(product.categoryName || product.category)
            )}
          </span>
          <h1 className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-2xl">
            {name}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                <Check size={13} />
                {t('product.inStock')}
              </span>
            ) : (
              <span className="badge bg-red-50 text-red-600">{t('product.outOfStock')}</span>
            )}
          </div>

          <div className="mt-4 flex items-end gap-3">
            <Price
              value={product.price}
              compareAt={product.isSpecialOffer ? product.oldPrice : undefined}
              size="lg"
            />
            {product.isSpecialOffer && product.oldPrice && (
              <span className="text-sm font-semibold text-brand-600">
                {t('product.save', { amount: formatPrice(product.oldPrice - product.price, lang) })}
              </span>
            )}
          </div>

          {description && <p className="mt-4 text-sm leading-relaxed text-ink-700">{description}</p>}

          {/* Actions */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-line bg-surface">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="px-3.5 py-3 text-ink-500 hover:text-ink-900 disabled:opacity-40"
                  aria-label={t('cart.decrease')}
                >
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center text-sm font-bold text-ink-900">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  className="px-3.5 py-3 text-ink-500 hover:text-ink-900 disabled:opacity-40"
                  aria-label={t('cart.increase')}
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={t('common.wishlist')}
                className={`inline-flex h-[50px] w-[50px] items-center justify-center rounded-xl border transition-colors ${
                  wished
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-line bg-surface text-ink-500 hover:text-red-500'
                }`}
              >
                <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleAdd} className="btn-secondary flex-1 py-3.5" disabled={product.stock <= 0}>
                {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                {t('common.addToCart')}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="btn-primary flex-1 py-3.5"
                disabled={product.stock <= 0}
              >
                {t('common.buyNow')}
              </button>
            </div>
          </div>

          {loginNotice && (
            <div className="mt-4">
              <Alert tone="warning">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <LogIn size={16} />
                  {t('cart.loginRequired')}
                  <Link to="/login" state={{ from: `/product/${product.id}` }} className="font-bold underline underline-offset-2">
                    {t('common.login')}
                  </Link>
                </span>
              </Alert>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-10" aria-label={t('product.related')}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="section-heading">{t('product.related')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}