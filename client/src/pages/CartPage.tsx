import { Link } from 'react-router-dom'
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, ArrowLeft, Truck } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../context/StoreContext'
import { localizedName } from '../utils/localize'
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../config/shop'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import { formatPrice } from '../components/common/Price'

export default function CartPage() {
  const { t, lang } = useLanguage()
  const { cart, updateQuantity, removeFromCart, cartTotal } = useStore()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

  const delivery = cartTotal > 0 && cartTotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0
  const total = cartTotal + delivery
  const progress = Math.min((cartTotal / FREE_DELIVERY_THRESHOLD) * 100, 100)
  const freeReached = cartTotal >= FREE_DELIVERY_THRESHOLD

  if (cart.length === 0) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <EmptyState
          icon={ShoppingCart}
          title={t('cart.empty')}
          description={t('cart.emptyDesc')}
          action={
            <Link to="/categories" className="btn-primary">
              {t('cart.continue')}
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader
        icon={ShoppingCart}
        title={t('cart.title')}
        subtitle={t('cart.subtitle')}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Items */}
        <div className="space-y-3">
          {cart.map(({ product, quantity }) => (
            <div key={product.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:border-line-strong sm:p-4">
              <Link
                to={`/product/${product.id}`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-canvas sm:h-28 sm:w-28"
              >
                <img src={product.image} alt={localizedName(product, lang)} className="h-full w-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/product/${product.id}`}
                    className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {localizedName(product, lang)}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id)}
                    aria-label={t('common.remove')}
                    className="icon-btn -me-1 -mt-1 shrink-0 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <span className="mt-1 text-xs text-ink-400">{t('brand.storeName')}</span>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-xl border border-line bg-canvas">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="px-2.5 py-2 text-ink-500 transition-colors hover:text-ink-900"
                      aria-label={t('cart.decrease')}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-ink-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, quantity + 1)}
                      className="px-2.5 py-2 text-ink-500 transition-colors hover:text-ink-900"
                      aria-label={t('cart.increase')}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold text-ink-900">
                      {formatPrice(product.price * quantity, lang)}
                    </p>
                    {quantity > 1 && (
                      <p className="text-xs text-ink-400">
                        {formatPrice(product.price, lang)} {t('common.products')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside>
          <div className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-32">
            <h2 className="text-base font-bold text-ink-900">{t('cart.summary')}</h2>

            {/* Delivery progress */}
            <div className="mt-4 rounded-xl bg-canvas p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                <Truck size={15} className="shrink-0 text-brand-600" />
                {freeReached
                  ? t('cart.freeReached')
                  : t('header.freeDelivery', { amount: formatPrice(FREE_DELIVERY_THRESHOLD - cartTotal, lang) })}
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-900/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${freeReached ? 'bg-success-500' : 'bg-brand-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.subtotal')}</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(cartTotal, lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.delivery')}</dt>
                <dd className={`font-semibold ${delivery === 0 ? 'text-brand-600' : 'text-ink-900'}`}>
                  {delivery === 0 ? t('cart.deliveryFree') : formatPrice(delivery, lang)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="font-bold text-ink-900">{t('cart.total')}</dt>
                <dd className="text-lg font-extrabold text-ink-900">{formatPrice(total, lang)}</dd>
              </div>
            </dl>
            <Link to="/checkout" className="btn-primary mt-5 w-full py-3.5">
              {t('cart.checkout')}
              <ArrowIcon size={17} />
            </Link>
            <Link to="/categories" className="btn-ghost mt-2 w-full">
              {t('cart.continue')}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}