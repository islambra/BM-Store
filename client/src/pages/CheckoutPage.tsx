import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Phone,
  User,
  MapPin,
  House,
  Building2,
  MessageSquareText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  HandCoins,
  LogIn,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../context/StoreContext'
import { useAuth } from '../context/AuthContext'
import { localizedName } from '../utils/localize'
import { wilayas, getWilayaName } from '../data/wilayas'
import { DELIVERY_FEE, ORDERS_STORAGE_KEY } from '../config/shop'
import { formatPrice } from '../components/common/Price'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import { Alert, Field, Input, Textarea, Select } from '../components/common/FormControls'
import { createOrder } from '../services/api'
import { getStoredReferral } from '../services/referral'
import type { Order, OrderStatus } from '../types'

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Order[]) : []
  } catch {
    return []
  }
}

export default function CheckoutPage() {
  const { t, lang } = useLanguage()
  const { cart, cartTotal, clearCart } = useStore()
  const { user } = useAuth()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

  const [fullName, setFullName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const delivery = cartTotal > 0 ? DELIVERY_FEE : 0
  const total = cartTotal + delivery

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim() || !wilaya || !commune.trim() || !address.trim()) {
      setError(true)
      return
    }
    setError(false)
    setSubmitting(true)

    const wilayaEntry = wilayas.find((w) => w.code === wilaya)
    const customer = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      wilaya,
      wilayaName: wilayaEntry ? getWilayaName(wilayaEntry, lang) : wilaya,
      commune: commune.trim(),
      address: address.trim(),
      note: note.trim() || undefined,
    }

    const order: Order = {
      id: `ORD-${Date.now()}`,
      items: cart.map(({ product, quantity }) => ({
        productId: product.id,
        name: localizedName(product, lang),
        qty: quantity,
        price: product.price,
        image: product.image,
      })),
      customer,
      subtotal: cartTotal,
      delivery,
      total,
      status: 'pending-review' as OrderStatus,
      createdAt: new Date().toISOString(),
    }

    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([...loadOrders(), order]))

    try {
      const referralId = getStoredReferral()?.id ?? undefined
      await createOrder({
        items: order.items.map(({ productId, qty }) => ({ productId, qty })),
        referralId,
        customer,
      })
    } catch {
      // Guest/local order remains saved; the order request is confirmed locally.
    }

    clearCart()
    setSubmitting(false)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (cart.length === 0 && !submitted) {
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

  if (!user) {
    return (
      <div className="container-app flex justify-center pt-10 sm:pt-16">
        <div className="w-full max-w-lg">
          <Alert tone="warning">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <LogIn size={16} />
              {t('cart.loginRequired')}
              <Link to="/login" state={{ from: '/checkout' }} className="font-bold underline underline-offset-2">
                {t('common.login')}
              </Link>
            </span>
          </Alert>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="container-app flex justify-center pt-10 sm:pt-16">
        <div className="w-full max-w-lg text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-success-50 text-success-600">
            <CheckCircle2 size={40} />
          </span>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {t('checkout.successTitle')}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
            {t('checkout.successDesc')}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-canvas px-4 py-3 text-sm font-semibold text-ink-700">
            <Phone size={17} className="text-brand-600" />
            {t('checkout.review')}
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/dashboard" className="btn-primary">
              {t('checkout.trackOrders')}
            </Link>
            <Link to="/" className="btn-ghost">
              <ArrowIcon size={17} />
              {t('checkout.backHome')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader
        icon={HandCoins}
        title={t('checkout.title')}
        subtitle={t('checkout.subtitle')}
      />

      <Alert tone="info" className="mt-4 max-w-2xl">
        <span className="flex items-center gap-2">
          <Phone size={16} />
          {t('checkout.review')}
        </span>
      </Alert>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Order request form */}
        <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-6 sm:p-8" noValidate>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <User size={18} className="text-brand-600" />
            {t('checkout.info')}
          </h2>

          {error && (
            <Alert tone="danger" className="mt-4">
              {t('checkout.required')}
            </Alert>
          )}

          <div className="mt-6 space-y-5">
            <Field id="fullName" label={t('checkout.fullName')} required>
              <Input
                id="fullName"
                icon={User}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder={t('checkout.fullName')}
              />
            </Field>

            <Field id="phone" label={t('checkout.phone')} required>
              <Input
                id="phone"
                icon={Phone}
                required
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="05 XX XX XX XX"
                dir="ltr"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="wilaya" label={t('checkout.wilaya')} required>
                <Select
                  id="wilaya"
                  icon={MapPin}
                  required
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                >
                  <option value="" disabled>
                    {t('checkout.wilayaPlaceholder')}
                  </option>
                  {wilayas.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code} - {getWilayaName(w, lang)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="commune" label={t('checkout.commune')} required>
                <Input
                  id="commune"
                  icon={Building2}
                  required
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  placeholder={t('checkout.commune')}
                />
              </Field>
            </div>

            <Field id="address" label={t('checkout.address')} required>
              <Textarea
                id="address"
                icon={House}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                autoComplete="street-address"
                placeholder={t('checkout.address')}
              />
            </Field>

            <Field id="note" label={`${t('checkout.note')} (${t('checkout.noteOptional')})`}>
              <Textarea
                id="note"
                icon={MessageSquareText}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={t('checkout.notePlaceholder')}
              />
            </Field>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary mt-7 w-full py-3.5">
            {submitting ? `${t('common.loading')}…` : t('checkout.submit')}
            <ArrowIcon size={17} />
          </button>
        </form>

        {/* Order summary */}
        <aside>
          <div className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-32">
            <h2 className="text-base font-bold text-ink-900">{t('cart.summary')}</h2>
            <ul className="mt-4 space-y-3">
              {cart.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="relative shrink-0">
                    <img src={product.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                      {quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                    {localizedName(product, lang)}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-ink-900">
                    {formatPrice(product.price * quantity, lang)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.subtotal')}</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(cartTotal, lang)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.delivery')}</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(delivery, lang)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="font-bold text-ink-900">{t('cart.total')}</dt>
                <dd className="text-lg font-extrabold text-ink-900">{formatPrice(total, lang)}</dd>
              </div>
            </dl>
            <Link to="/cart" className="btn-ghost mt-4 w-full py-3">
              <ArrowIcon size={16} />
              {t('checkout.editCart')}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}