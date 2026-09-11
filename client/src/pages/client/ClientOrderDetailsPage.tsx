import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  LoaderCircle,
  MapPin,
  Minus,
  Package,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import { deleteMyOrder, getErrorMessage, getMyOrders, updateMyOrder, type MyOrderRecord } from '../../services/api'
import { cachedProductFetcher } from '../../services/catalog'
import { formatPrice } from '../../components/common/Price'
import OrderStatusBadge, { statusKey } from '../../components/common/OrderStatusBadge'
import EmptyState from '../../components/common/EmptyState'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Field, Input, Select, Textarea } from '../../components/common/FormControls'
import { getWilayaName, wilayas } from '../../data/wilayas'

const TIMELINE_STAGES = [
  'pending-review',
  'customer-contacted',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]

const TERMINAL_STATUSES = ['cancelled', 'rejected']

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(
      new Date(iso),
    )
  } catch {
    return ''
  }
}

function Timeline({ status }: { status: string }) {
  const { t } = useLanguage()
  if (TERMINAL_STATUSES.includes(status)) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-canvas/70 px-4 py-3">
        <OrderStatusBadge status={status} />
        <p className="text-xs text-ink-500">{t(statusKey[status] ?? 'order.pendingReview')}</p>
      </div>
    )
  }
  const current = TIMELINE_STAGES.indexOf(status)
  return (
    <ol className="space-y-0">
      {TIMELINE_STAGES.map((stage, i) => {
        const done = current === -1 ? false : i <= current
        const isCurrent = i === current
        const isLast = i === TIMELINE_STAGES.length - 1
        return (
          <li key={stage} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors ${
                  done ? 'bg-brand-600' : 'bg-ink-900/10 text-ink-400'
                } ${isCurrent ? 'ring-2 ring-brand-200 ring-offset-1' : ''}`}
              >
                {done && <Check size={13} strokeWidth={3} />}
              </span>
              {!isLast && <span className={`h-5 w-0.5 ${i < current ? 'bg-brand-600' : 'bg-ink-900/10'}`} />}
            </span>
            <span className={`pb-4 text-[13px] leading-6 ${done ? 'font-bold text-ink-900' : 'font-medium text-ink-400'}`}>
              {t(statusKey[stage])}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function OrderProductImage({ productId, name, image }: { productId: string; name: string; image?: string }) {
  const [src, setSrc] = useState<string | null>(image ?? null)
  useEffect(() => {
    if (image) {
      setSrc(image)
      return
    }
    let active = true
    cachedProductFetcher(productId)
      .then((p) => {
        if (active) setSrc(p.image || p.thumbnail || null)
      })
      .catch(() => {
        if (active) setSrc(null)
      })
    return () => {
      active = false
    }
  }, [productId, image])
  if (!src) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink-300">
        <Package size={22} />
      </span>
    )
  }
  return <img src={src} alt={name} loading="lazy" className="h-14 w-14 shrink-0 rounded-xl border border-line object-cover" />
}

function DetailsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-32 rounded bg-ink-900/5" />
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="h-5 w-40 rounded bg-ink-900/5" />
        <div className="mt-4 space-y-3">
          <div className="h-16 rounded-xl bg-ink-900/5" />
          <div className="h-16 rounded-xl bg-ink-900/5" />
        </div>
      </div>
    </div>
  )
}

export default function ClientOrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useLanguage()
  const rtl = lang === 'ar'
  const BackIcon = rtl ? ArrowRight : ArrowLeft
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(() => getMyOrders())

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  const order: MyOrderRecord | undefined = data?.orders.find((o) => o._id === id)
  const editable = order?.status === 'pending-review'

  const confirmDelete = async () => {
    if (!order || deleting) return
    setDeleting(true)
    setActionError('')
    try {
      await deleteMyOrder(order._id)
      navigate('/dashboard/orders', { replace: true })
    } catch (err) {
      setActionError(getErrorMessage(err))
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        to="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-brand-700"
      >
        <BackIcon size={15} />
        {t('client.backToOrders')}
      </Link>

      {loading ? (
        <div className="mt-4">
          <DetailsSkeleton />
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-danger-100 bg-danger-50 p-6 text-center">
          <p className="text-sm font-medium text-danger-600">{error}</p>
        </div>
      ) : !order ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface shadow-sm">
          <EmptyState
            icon={Package}
            title={t('client.orderNotFound')}
            action={
              <Link to="/dashboard/orders" className="btn-secondary">
                {t('client.backToOrders')}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {notice && (
            <p className="rounded-xl bg-success-50 px-3.5 py-2.5 text-sm font-medium text-success-700">{notice}</p>
          )}
          {actionError && (
            <p role="alert" className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
              {actionError}
            </p>
          )}
          {/* Header card */}
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-extrabold tabular-nums text-ink-900" dir="ltr">
                #{order.orderRef}
              </h1>
              <OrderStatusBadge status={order.status} />
              {editable && (
                <span className="ms-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                  >
                    <Pencil size={13} />
                    {t('client.editOrder')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-bold text-danger-600 transition-colors hover:border-danger-200 hover:bg-danger-50"
                  >
                    <Trash2 size={13} />
                    {t('client.deleteOrder')}
                  </button>
                </span>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
              <Calendar size={12} />
              {t('client.orderDate')}: {formatDate(order.createdAt, rtl ? 'ar-DZ' : 'en-US')}
            </p>
            <div className="mt-4 border-t border-line pt-4">
              <Timeline status={order.status} />
            </div>
          </section>

          {/* Products */}
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink-900">
              {t('client.products')} ({order.items.length})
            </h2>
            <ul className="mt-3 space-y-2.5">
              {order.items.map((item, i) => (
                <li key={`${item.productId}-${i}`} className="flex items-center gap-3 rounded-xl bg-canvas/70 px-3 py-2.5">
                  <OrderProductImage productId={item.productId} name={item.name} image={item.image} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{item.name}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-ink-400">
                      {t('client.quantity')}: {item.qty} · {formatPrice(item.price, lang)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold tabular-nums text-ink-900">
                    {formatPrice(item.price * item.qty, lang)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex items-center justify-between text-ink-500">
                <dt>{t('client.subtotal')}</dt>
                <dd className="font-semibold tabular-nums">{formatPrice(order.subtotal, lang)}</dd>
              </div>
              <div className="flex items-center justify-between text-ink-500">
                <dt>{t('client.delivery')}</dt>
                <dd className="font-semibold tabular-nums">{formatPrice(order.delivery, lang)}</dd>
              </div>
              <div className="flex items-center justify-between pt-1 text-base font-extrabold text-ink-900">
                <dt>{t('client.total')}</dt>
                <dd className="tabular-nums text-brand-700">{formatPrice(order.total, lang)}</dd>
              </div>
            </dl>
          </section>

          {/* Delivery info */}
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-bold text-ink-900">{t('client.deliveryInfo')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2.5 text-ink-700">
                <User size={15} className="shrink-0 text-ink-400" />
                <span className="font-semibold">{order.customer.fullName}</span>
              </li>
              <li className="flex items-center gap-2.5 text-ink-700" dir="ltr">
                <Phone size={15} className="shrink-0 text-ink-400" />
                <span className="tabular-nums">{order.customer.phone}</span>
              </li>
              <li className="flex items-start gap-2.5 text-ink-700">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-400" />
                <span>
                  {order.customer.wilayaName ?? order.customer.wilaya} · {order.customer.commune}
                  <br />
                  <span className="text-ink-500">{order.customer.address}</span>
                </span>
              </li>
            </ul>
          </section>
        </div>
      )}

      {editOpen && order && (
        <EditOrderModal
          order={order}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            setNotice(t('client.orderUpdated'))
            setActionError('')
            void reload()
          }}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={t('client.deleteOrderTitle')}
        description={t('client.deleteOrderDesc')}
        confirmLabel={t('client.deleteOrder')}
        cancelLabel={t('common.cancel')}
        danger
        busy={deleting}
        icon={<Trash2 size={22} />}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}

interface DraftItem {
  productId: string
  name: string
  qty: number
  price: number
}

function EditOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: MyOrderRecord
  onClose: () => void
  onSaved: () => void
}) {
  const { t, lang } = useLanguage()
  const [items, setItems] = useState<DraftItem[]>(
    order.items.map((it) => ({ productId: String(it.productId), name: it.name, qty: it.qty, price: it.price })),
  )
  const [wilaya, setWilaya] = useState(order.customer.wilaya)
  const [commune, setCommune] = useState(order.customer.commune)
  const [address, setAddress] = useState(order.customer.address)
  const [note, setNote] = useState(order.customer.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const setQty = (index: number, qty: number) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, qty: Math.max(1, qty) } : it)))

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  const save = async () => {
    setError('')
    if (items.length === 0 || !wilaya.trim() || !commune.trim() || !address.trim()) {
      setError(t('checkout.required'))
      return
    }
    setBusy(true)
    try {
      const entry = wilayas.find((w) => w.code === wilaya)
      await updateMyOrder(order._id, {
        items: items.map(({ productId, qty }) => ({ productId, qty })),
        customer: {
          wilaya: wilaya.trim(),
          wilayaName: entry ? getWilayaName(entry, lang) : wilaya.trim(),
          commune: commune.trim(),
          address: address.trim(),
          note: note.trim(),
        },
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('client.editOrder')}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink-900">
            {t('client.editOrder')} <span className="tabular-nums" dir="ltr">#{order.orderRef}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="icon-btn text-ink-400">
            <X size={18} />
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
            {error}
          </p>
        )}

        <h3 className="mt-4 text-sm font-bold text-ink-900">{t('client.products')}</h3>
        <ul className="mt-2 space-y-2">
          {items.map((item, i) => (
            <li key={`${item.productId}-${i}`} className="flex items-center gap-2.5 rounded-xl bg-canvas/70 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-900">{item.name}</p>
                <p className="text-xs tabular-nums text-ink-400">{formatPrice(item.price, lang)}</p>
              </div>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQty(i, item.qty - 1)}
                  disabled={item.qty <= 1}
                  aria-label="−"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-600 transition-colors hover:border-brand-300 disabled:opacity-40"
                >
                  <Minus size={13} />
                </button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(i, item.qty + 1)}
                  aria-label="+"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-600 transition-colors hover:border-brand-300"
                >
                  <Plus size={13} />
                </button>
              </span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                disabled={items.length <= 1}
                aria-label={t('common.remove')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-danger-500 transition-colors hover:bg-danger-50 disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>

        <h3 className="mt-4 text-sm font-bold text-ink-900">{t('client.deliveryInfo')}</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label={t('checkout.wilaya')} required>
            <Select value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
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
          <Field label={t('checkout.commune')} required>
            <Input value={commune} onChange={(e) => setCommune(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('checkout.address')} required>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={`${t('checkout.note')} (${t('checkout.noteOptional')})`}>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="btn-primary inline-flex items-center gap-2"
          >
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
