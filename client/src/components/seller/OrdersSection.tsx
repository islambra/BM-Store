import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Package, Search, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import SectionHeader from '../common/SectionHeader'
import { Input, Select } from '../common/FormControls'
import OrderStatusBadge from '../common/OrderStatusBadge'
import { formatPrice } from '../common/Price'
import { ErrorNote, Loader } from '../admin/adminShared'
import { TicketChip } from './sellerShared'

interface StatusAction {
  target: string
  labelKey: string
  titleKey: string
  descKey: string
  confirmKey: string
  danger?: boolean
  kind?: 'status' | 'delete'
}

const deleteAction: StatusAction = {
  target: 'delete',
  kind: 'delete',
  labelKey: 'seller.orders.delete',
  titleKey: 'seller.orders.deleteTitle',
  descKey: 'seller.orders.deleteDesc',
  confirmKey: 'seller.orders.delete',
  danger: true,
}

/* Next valid workflow step(s) for each status — mirrors the server state machine. */
function actionsFor(status: string): StatusAction[] {
  switch (status) {
    case 'pending':
      return [
        { target: 'confirmed', labelKey: 'admin.confirmOrder', titleKey: 'admin.confirmTitle', descKey: 'admin.confirmDesc', confirmKey: 'admin.confirmOrder' },
        { target: 'rejected', labelKey: 'seller.orders.reject', titleKey: 'seller.orders.rejectTitle', descKey: 'seller.orders.rejectDesc', confirmKey: 'seller.orders.reject', danger: true },
        { target: 'cancelled', labelKey: 'admin.cancelOrder', titleKey: 'admin.cancelTitle', descKey: 'admin.cancelDesc', confirmKey: 'admin.cancelOrder', danger: true },
      ]
    case 'confirmed':
      return [
        { target: 'delivered', labelKey: 'admin.markDelivered', titleKey: 'admin.deliverTitle', descKey: 'admin.deliverDesc', confirmKey: 'admin.markDelivered' },
        { target: 'cancelled', labelKey: 'admin.cancelOrder', titleKey: 'admin.cancelTitle', descKey: 'admin.cancelDesc', confirmKey: 'admin.cancelOrder', danger: true },
      ]
    default:
      return []
  }
}

export default function SellerOrdersSection() {
  const { t, lang } = useLanguage()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pending, setPending] = useState<{ order: api.SellerOrderPayload; action: StatusAction } | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const limit = 10

  const { data, loading, error, reload } = useAsync(
    () => api.listMyOrders({ page, limit, status: statusFilter }),
    [page, statusFilter],
  )

  const statusOptions = [
    { value: '', label: t('admin.all') },
    { value: 'pending', label: t('order.pending') },
    { value: 'confirmed', label: t('order.confirmed') },
    { value: 'delivered', label: t('order.delivered') },
    { value: 'cancelled', label: t('order.cancelled') },
    { value: 'rejected', label: t('order.rejected') },
  ]

  const runAction = async () => {
    if (!pending) return
    setBusy(true)
    setNotice('')
    try {
      if (pending.action.kind === 'delete') {
        await api.deleteMyStoreOrder(String(pending.order._id))
      } else {
        await api.updateMyOrderStatus(String(pending.order._id), pending.action.target)
      }
      setPending(null)
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const allOrders = data?.orders ?? []
  const pages = data?.pages ?? 0
  const total = data?.total ?? 0

  const orders = allOrders.filter((o) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return (
      o.orderRef.toLowerCase().includes(needle) ||
      o.customer.fullName.toLowerCase().includes(needle) ||
      (o.customer.phone ?? '').toLowerCase().includes(needle)
    )
  })

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          title={t('seller.orders.title')}
          subtitle={t('seller.orders.subtitle')}
          badge={total > 0 ? String(total) : undefined}
        />
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full max-w-sm">
            <Input icon={Search} placeholder={t('admin.searchOrders')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            options={statusOptions}
            aria-label={t('seller.orders.status')}
            className="w-full sm:w-52"
          />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {query ? (
            <EmptyState icon={Search} title={t('common.noResults')} />
          ) : (
            <EmptyState icon={ClipboardList} title={t('seller.orders.noOrders')} description={t('admin.noOrdersDesc')} />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const actions = actionsFor(o.status)
            const isOpen = expanded === String(o._id)
            const discount = o.discountPercent ?? 0
            const discountValue = o.discountAmount ?? 0
            return (
              <article key={String(o._id)} className="overflow-hidden rounded-2xl border border-line bg-surface">
                {/* Ticket strip — reference, state, date */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-canvas/60 px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <TicketChip dir="ltr">{o.orderRef}</TicketChip>
                    <OrderStatusBadge status={o.status} />
                    {o.customerOrderNumber != null && (
                      <TicketChip dir="ltr">#{o.customerOrderNumber}</TicketChip>
                    )}
                    {discount > 0 && (
                      <span className="badge bg-success-50 text-success-700">−{discount}%</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-ink-400">
                    {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                  </span>
                </div>

                {/* Ledger — items */}
                <ul className="space-y-1.5 px-5 py-4">
                  {o.items.map((item, i) => (
                    <li key={item.productId ?? i} className="flex items-center justify-between gap-3 rounded-xl bg-canvas/40 px-3 py-2">
                      <span className="flex min-w-0 items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            loading="lazy"
                            className="h-9 w-9 shrink-0 rounded-lg border border-line bg-canvas object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <Package size={16} />
                          </span>
                        )}
                        <span className="min-w-0 truncate text-sm font-medium text-ink-800">
                          {item.name}
                          <span className="ms-1.5 font-normal text-ink-400">× {item.qty}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                        {formatPrice(item.price * item.qty, lang)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Express strip — delivery, total, actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/40 px-5 py-4">
                  <div className="min-w-0 text-xs text-ink-500">
                    <p className="font-semibold text-ink-700">{o.customer.fullName}</p>
                    <p dir="ltr" className="mt-0.5 tabular-nums">{o.customer.phone}</p>
                    <p className="mt-0.5">
                      {o.customer.wilayaName || o.customer.wilaya} · {o.customer.commune} · {o.customer.address}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="me-1 text-end">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{t('client.total')}</p>
                      <p className="text-base font-extrabold tabular-nums text-ink-900">{formatPrice(o.total, lang)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : String(o._id))}
                      aria-expanded={isOpen}
                      className="btn-secondary btn-sm inline-flex items-center gap-1"
                    >
                      {t(isOpen ? 'admin.hideDetails' : 'admin.viewDetails')}
                      <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {o.status === 'delivered' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-success-50 px-3.5 py-2 text-[13px] font-bold text-success-700">
                        <CheckCircle2 size={15} />
                        {t('order.delivered')}
                      </span>
                    ) : (
                      actions.map((a) => (
                        <button
                          key={a.target}
                          type="button"
                          onClick={() => setPending({ order: o, action: a })}
                          className={a.danger ? 'btn-secondary btn-sm text-danger-700' : 'btn-primary btn-sm'}
                        >
                          {t(a.labelKey)}
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={() => setPending({ order: o, action: deleteAction })}
                      className="btn-secondary btn-sm inline-flex items-center gap-1 text-danger-700"
                    >
                      <Trash2 size={14} />
                      {t('seller.orders.delete')}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="space-y-4 border-t border-line bg-canvas/60 px-5 py-4 text-sm">
                    <section>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink-400">
                        {t('admin.customerInfo')}
                      </h4>
                      <div className="mt-1.5 text-[13px] text-ink-700">
                        <p className="font-semibold text-ink-900">{o.customer.fullName}</p>
                        <p dir="ltr" className="mt-0.5 tabular-nums">
                          {o.customer.phone}
                        </p>
                        <p className="mt-0.5">
                          {o.customer.wilayaName || o.customer.wilaya} · {o.customer.commune} · {o.customer.address}
                        </p>
                      </div>
                    </section>
                    <section>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink-400">
                        {t('admin.orderInfo')}
                      </h4>
                      <dl className="mt-1.5 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-ink-500">ID</dt>
                          <dd className="font-semibold tabular-nums text-ink-900" dir="ltr">{o.orderRef}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-ink-500">{t('admin.customerOrder')}</dt>
                          <dd className="font-semibold tabular-nums text-ink-900">
                            {o.customerOrderNumber != null ? `#${o.customerOrderNumber}` : '—'}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-ink-500">{t('admin.orderStatus')}</dt>
                          <dd>
                            <OrderStatusBadge status={o.status} />
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-ink-500">{t('client.orderDate')}</dt>
                          <dd className="font-semibold text-ink-900">
                            {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                          </dd>
                        </div>
                      </dl>
                    </section>
                    <section>
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink-400">
                        {t('admin.pricingSummary')}
                      </h4>
                      <dl className="mt-1.5 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-ink-500">{t('client.subtotal')}</dt>
                          <dd className="font-semibold tabular-nums text-ink-900">{formatPrice(o.subtotal, lang)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-ink-500">{t('client.delivery')}</dt>
                          <dd className="font-semibold tabular-nums text-ink-900">{formatPrice(o.delivery, lang)}</dd>
                        </div>
                        {discountValue > 0 && (
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-ink-500">
                              {t('admin.customerDiscount')}{discount > 0 ? ` (${discount}%)` : ''}
                            </dt>
                            <dd className="font-semibold tabular-nums text-success-700">
                              −{formatPrice(discountValue, lang)}
                            </dd>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <dt className="font-bold text-ink-900">{t('client.total')}</dt>
                          <dd className="font-extrabold tabular-nums text-brand-700">{formatPrice(o.total, lang)}</dd>
                        </div>
                      </dl>
                    </section>
                    {o.customer.note && (
                      <p className="text-[13px] text-ink-600">
                        <span className="font-bold text-ink-900">{t('admin.orderNote')}: </span>
                        {o.customer.note}
                      </p>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-500">
            {t('admin.showing')} {(page - 1) * limit + 1} {t('admin.of')} {Math.min(page * limit, total)} ({total} {t('admin.total')})
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="icon-btn disabled:opacity-40"
              aria-label={t('common.previous')}
            >
              <ChevronLeft size={18} className="rtl:rotate-180" />
            </button>
            <span className="inline-flex items-center text-sm font-medium text-ink-700">{page} / {pages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="icon-btn disabled:opacity-40"
              aria-label={t('common.next')}
            >
              <ChevronRight size={18} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? t(pending.action.titleKey) : ''}
        description={pending ? t(pending.action.descKey) : ''}
        confirmLabel={pending ? t(pending.action.confirmKey) : ''}
        cancelLabel={t('common.cancel')}
        busy={busy}
        danger={pending?.action.danger}
        onConfirm={() => void runAction()}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}