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
  Sparkles,
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
import { formatPrice } from '../components/common/Price'
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
  const [error, setError] = useState('')

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
        <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-10 xl:gap-12">
          <div className="mx-auto aspect-square w-full max-w-[460px] animate-pulse rounded-2xl bg-ink-900/10 lg:mx-0 lg:max-w-none" />
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
    setError('')
    const result = addToCart(product, qty)
    if (!result.success) {
      setError(result.message || '')
      return
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  const handleBuyNow = () => {
    setError('')
    const result = addToCart(product, qty)
    if (!result.success) {
      setError(result.message || '')
      return
    }
    if (!user) {
      setLoginNotice(true)
      return
    }
    navigate('/checkout')
  }

  return (
    <div className="container-app pt-4 sm:pt-8">
      <Breadcrumb
        items={[
          { label: t('nav.categories'), to: '/categories' },
          ...(category ? [{ label: localizedName(category, lang), to: `/category/${category.slug}` }] : []),
          { label: name },
        ]}
      />

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-10 xl:gap-12">
        {/* Gallery */}
        <div className="mx-auto w-full min-w-0 max-w-[460px] lg:mx-0 lg:max-w-none">
          <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            {product.isSpecialOffer && product.discount > 0 && (
              <span className="absolute start-4 top-4 z-10 inline-flex items-center rounded-lg bg-accent-500 px-2.5 py-1.5 text-sm font-extrabold text-white shadow-lift">
                -{product.discount}%
              </span>
            )}
            <div className="aspect-square">
              <img
                src={product.images[mainImage] ?? product.image}
                alt={name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
          </div>
          {product.images.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMainImage(i)}
                  aria-label={t('product.imageLabel', { index: i + 1 })}
                  title={t('product.imageLabel', { index: i + 1 })}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all sm:h-20 sm:w-20 ${
                    mainImage === i
                      ? 'border-brand-600 shadow-focused'
                      : 'border-transparent opacity-70 hover:border-brand-300 hover:opacity-100'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col lg:sticky lg:top-6 lg:self-start">
          {category ? (
            <button
              type="button"
              onClick={() => navigate(`/category/${category.slug}`)}
              className="-mx-2 -my-1 self-start rounded-lg px-2 py-1 transition-colors hover:bg-brand-50"
            >
              <span className="eyebrow">{localizedName(category, lang)}</span>
            </button>
          ) : (
            <span className="eyebrow">{localizeCategory(product.categoryName || product.category)}</span>
          )}
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-ink-900 text-balance sm:text-3xl">
            {name}
          </h1>

          {/* Price panel */}
          <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-5">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-3xl font-extrabold tracking-tight text-ink-900">{formatPrice(product.price, lang)}</span>
                {product.isSpecialOffer && product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-lg font-medium text-ink-400 line-through">{formatPrice(product.oldPrice, lang)}</span>
                )}
              </div>
              {product.isSpecialOffer && product.oldPrice && product.oldPrice > product.price && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-1.5 text-sm font-bold text-accent-700">
                  <Sparkles size={15} />
                  {t('product.save', { amount: formatPrice(product.oldPrice - product.price, lang) })}
                </span>
              )}
            </div>
            {product.isSpecialOffer && <div className="h-1 w-full bg-gradient-to-r from-accent-400 to-brand-500" />}
          </div>

          {description && <p className="mt-5 text-sm leading-relaxed text-ink-700">{description}</p>}

          {/* Actions */}
          <div className="mt-6 space-y-3">
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
  onClick={() => setQty((q) => q + 1)}
  className="px-3.5 py-3 text-ink-500 hover:text-ink-900"
  aria-label={t('cart.increase')}
>
  <Plus size={16} />
</button>
              </div>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={t('common.wishlist')}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
                  wished
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-line bg-surface text-ink-500 hover:border-red-200 hover:text-red-500'
                }`}
              >
                <Heart size={20} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleAdd} className="btn-secondary flex-1 py-3.5">
                {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                {t('common.addToCart')}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="btn-primary flex-1 py-3.5"
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