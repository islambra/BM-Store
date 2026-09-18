import { useEffect, useMemo, useState } from 'react'
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
import { localizeError } from '../utils/errors'
import { wilayas } from '../data/wilayas'
import { formatPrice } from '../components/common/Price'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import { Alert, Field, Input, Textarea, Select } from '../components/common/FormControls'
import { createOrder, getMyOrders, getPublicRewards, getWilayas, type PublicRewards, type WilayaRecord } from '../services/api'
import { getStoredReferral, getVisitorId } from '../services/referral'

function newClientKey() {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  return `ck-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export default function CheckoutPage() {
  const { t, lang } = useLanguage()
  const { cart, cartTotal, clearCart, deliveryFee } = useStore()
  const { user } = useAuth()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

  const [wilaya, setWilaya] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Name + phone always come from the user's profile — no manual entry needed.
  const profileName = user?.name.trim() ?? ''
  const profilePhone = user?.phone?.trim() ?? ''

  // One stable idempotency key per checkout attempt: retries and double
  // clicks reuse it, so the backend never creates a duplicate order.
  const clientKey = useMemo(() => newClientKey(), [])

  // Reward estimate (display only — the backend computes the real per-category
  // breakdown, personal order number and totals when the order is confirmed).
  // Step 1: the customer's next reward number.
  const [nextInfo, setNextInfo] = useState<{ n: number } | null>(null)
  useEffect(() => {
    if (!user) return
    let active = true
    getMyOrders()
      .then((res) => {
        if (active) setNextInfo({ n: res.nextCustomerOrderNumber ?? 1 })
      })
      .catch(() => {
        if (active) setNextInfo(null)
      })
    return () => {
      active = false
    }
  }, [user])

  // Step 2: the reward percentages active on BM Store categories.
  const [rewards, setRewards] = useState<PublicRewards | null>(null)
  useEffect(() => {
    let active = true
    getPublicRewards()
      .then((res) => {
        if (active) setRewards(res)
      })
      .catch(() => {
        if (active) setRewards(null)
      })
    return () => {
      active = false
    }
  }, [])

  // Active wilayas come from the backend with their live delivery price. The
  // selected option value is the wilaya `_id`, and checkout sends only that id
  // — the server resolves the name/code/price and never trusts the client.
  const [wilayaList, setWilayaList] = useState<WilayaRecord[]>([])
  useEffect(() => {
    let active = true
    getWilayas()
      .then((res) => {
        if (active) setWilayaList(res)
      })
      .catch(() => {
        if (active) setWilayaList([])
      })
    return () => {
      active = false
    }
  }, [])

  // Per-category estimate for the NEXT order: order #n uses the special
  // percent when n is a milestone (n % 10 === 0), otherwise the normal one.
  const eligible = useMemo(() => {
    if (!rewards?.enabled) return []
    const bySlug = new Map(rewards.categories.map((c) => [c.slug, c]))
    const pctKey = (nextInfo ? nextInfo.n : 1) % 10 === 0 ? 'rewardSpecialPercent' : 'rewardNormalPercent'
    const acc = new Map<string, { cat: PublicRewards['categories'][number]; amount: number }>()
    for (const { product, quantity } of cart) {
      const c = bySlug.get(product.category)
      if (!c || !c[pctKey]) continue
      const { cat, amount } = acc.get(product.category) ?? { cat: c, amount: 0 }
      acc.set(product.category, { cat, amount: amount + (product.price * quantity * c[pctKey]) / 100 })
    }
    return [...acc.values()].map(({ cat, amount }) => ({
      name: localizedName(cat, lang),
      pct: cat[pctKey],
      amount: Math.round(amount),
    }))
  }, [rewards, nextInfo, cart, lang])

  const estimateDiscount = eligible.reduce((sum, row) => sum + row.amount, 0)
  const estimatePercent = cartTotal > 0 && estimateDiscount > 0 ? Math.round((estimateDiscount / cartTotal) * 100) : 0

  // Deliverable wilayas: the backend list (values are `_id`s) when available,
  // otherwise the static list falls back to legacy codes.
  const options = useMemo(() => {
    if (wilayaList.length > 0) {
      return wilayaList.map((w) => ({
        value: w._id,
        kind: 'id' as const,
        code: w.code,
        name: w.name,
        nameAr: w.nameAr,
        deliveryPrice: w.deliveryPrice,
      }))
    }
    return wilayas.map((w) => ({
      value: w.code,
      kind: 'code' as const,
      code: w.code,
      name: w.name,
      nameAr: w.nameAr,
      deliveryPrice: deliveryFee,
    }))
  }, [wilayaList, deliveryFee])

  const chosen = options.find((o) => o.value === wilaya)
  const delivery = cartTotal > 0 ? (chosen ? chosen.deliveryPrice : deliveryFee) : 0
  const total = cartTotal + delivery - (cartTotal > 0 ? estimateDiscount : 0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileName || !profilePhone || !wilaya || !commune.trim() || !address.trim()) {
      setError(true)
      return
    }
    setError(false)
    setActionError('')
    setSubmitting(true)

    const selected = options.find((o) => o.value === wilaya)
    const customer = {
      fullName: profileName,
      phone: profilePhone,
      // Send only the wilaya `_id`; the server resolves code/name/price.
      ...(selected?.kind === 'id' ? { wilayaId: selected.value } : { wilaya: wilaya }),
      commune: commune.trim(),
      address: address.trim(),
      note: note.trim() || undefined,
    }

    try {
      const referralId = getStoredReferral()?.id ?? undefined
      await createOrder({
        items: cart.map(({ product, quantity }) => ({ productId: product.id, qty: quantity })),
        referralId,
        visitorId: getVisitorId(),
        clientKey,
        customer,
      })
    } catch (err) {
      // The order was not created server-side — keep the cart intact so the
      // customer can fix the issue and retry instead of losing their items.
      setActionError(localizeError(err, t))
      setSubmitting(false)
      return
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
            <Link to="/dashboard/orders" className="btn-primary">
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

          {actionError && (
            <Alert tone="danger" className="mt-4">
              <p role="alert">{actionError}</p>
            </Alert>
          )}

          <div className="mt-6 space-y-5">
            {/* Ordering as — taken from profile, not typed manually */}
            <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/70 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-base font-bold text-white">
                {profileName.charAt(0).toUpperCase() || <User size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{profileName}</p>
                <p className="truncate text-xs tabular-nums text-ink-500" dir="ltr">{profilePhone}</p>
              </div>
              <Link
                to="/dashboard/profile"
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
              >
                {t('common.edit')}
              </Link>
            </div>

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
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.code} - {lang === 'ar' ? o.nameAr || o.name : o.name} · {formatPrice(o.deliveryPrice, lang)}
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
            {eligible.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {eligible.map((row) => (
                  <span
                    key={row.name}
                    className="rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold text-success-700"
                  >
                    {row.name} · {row.pct}%
                  </span>
                ))}
              </div>
            )}
            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.subtotal')}</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(cartTotal, lang)}</dd>
              </div>
              {estimateDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">
                    {t('client.loyaltyDiscount')} ({estimatePercent}%)
                  </dt>
                  <dd className="font-semibold tabular-nums text-success-700">−{formatPrice(estimateDiscount, lang)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('cart.delivery')}</dt>
                <dd className="font-semibold text-ink-900">{formatPrice(delivery, lang)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="font-bold text-ink-900">{t('cart.total')}</dt>
                <dd className="text-lg font-extrabold text-ink-900">{formatPrice(total, lang)}</dd>
              </div>
            </dl>
            {nextInfo && estimateDiscount > 0 && (
              <p className="mt-3 rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-brand-800">
                {t('client.checkoutDiscountHint', { n: nextInfo.n })}
              </p>
            )}
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