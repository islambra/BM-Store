import { useState } from 'react'
import { ClipboardList, Search } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import { Input } from '../common/FormControls'
import OrderStatusBadge from '../common/OrderStatusBadge'
import { formatPrice } from '../common/Price'
import { ErrorNote, Loader } from './adminShared'

export default function OrdersSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminOrders())
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<{ order: api.AdminOrderRecord; action: 'confirm' | 'cancel' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const allOrders = data?.orders ?? []

  if (allOrders.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface">
        <EmptyState icon={ClipboardList} title={t('admin.noOrders')} description={t('admin.noOrdersDesc')} />
      </div>
    )
  }

  const orders = allOrders.filter((o) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return (
      o.orderRef.toLowerCase().includes(needle) ||
      o.customer.fullName.toLowerCase().includes(needle) ||
      (o.customer.phone ?? '').toLowerCase().includes(needle)
    )
  })

  const runAction = async () => {
    if (!pending) return
    setBusy(true)
    setNotice('')
    try {
      await api.updateAdminOrderStatus(String(pending.order._id), pending.action === 'confirm' ? 'confirmed' : 'cancelled')
      setPending(null)
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}
      <div className="w-full max-w-sm">
        <Input icon={Search} placeholder={t('admin.searchOrders')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface">
          <EmptyState icon={Search} title={t('common.noResults')} />
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={String(o._id)} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink-900">{o.orderRef}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <span className="text-xs text-ink-400">
                  {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {o.items.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink-700">
                      {item.name} <span className="text-ink-400">× {item.qty}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-ink-900">{formatPrice(item.price * item.qty, lang)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <div className="min-w-0 text-xs text-ink-500">
                  <p className="font-semibold text-ink-700">{o.customer.fullName}</p>
                  <p dir="ltr" className="mt-0.5">
                    {o.customer.phone}
                  </p>
                  <p className="mt-0.5">
                    {o.customer.wilayaName || o.customer.wilaya} · {o.customer.commune} · {o.customer.address}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-extrabold text-ink-900">{formatPrice(o.total, lang)}</span>
                  {o.status === 'pending-review' && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPending({ order: o, action: 'confirm' })} className="btn-primary btn-sm">
                        {t('admin.confirm')}
                      </button>
                      <button type="button" onClick={() => setPending({ order: o, action: 'cancel' })} className="btn-secondary btn-sm text-danger-700">
                        {t('admin.cancelOrder')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.action === 'confirm' ? t('admin.confirmTitle') : t('admin.cancelTitle')}
        description={pending?.action === 'confirm' ? t('admin.confirmDesc') : t('admin.cancelDesc')}
        confirmLabel={pending?.action === 'confirm' ? t('admin.confirm') : t('admin.cancelOrder')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        danger={pending?.action !== 'confirm'}
        onConfirm={() => void runAction()}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}