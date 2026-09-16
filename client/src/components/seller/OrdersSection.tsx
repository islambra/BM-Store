import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Package, Eye, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { listMyOrders, updateMyOrderStatus, deleteMyStoreOrder } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'
import { Select, Button } from '../../components/common/FormControls'
import { formatPrice } from '../../components/common/Price'
import OrderStatusBadge, { statusKey } from '../../components/common/OrderStatusBadge'
import ConfirmDialog from '../../components/common/ConfirmDialog'

type Order = {
  _id: string
  orderRef: string
  status: string
  items: { name: string; qty: number; price: number; image?: string }[]
  customer: {
    fullName: string
    phone: string
    wilaya: string
    commune: string
    address: string
    note?: string
  }
  subtotal: number
  delivery: number
  total: number
  createdAt: string
}

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
]

const validTransitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled', 'rejected'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  rejected: [],
  cancelled: [],
}

export default function SellerOrdersSection() {
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [deleting, setDeleting] = useState<Order | null>(null)
  const [busy, setBusy] = useState(false)
  const limit = 10

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await listMyOrders({ page, limit, status: statusFilter })
      setOrders(res.orders)
      setTotal(res.total)
      setPages(res.pages)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [page, statusFilter])

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (!validTransitions[order.status]?.includes(newStatus)) return

    try {
      await updateMyOrderStatus(order._id, newStatus)
      fetchOrders()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDelete = async (order: Order) => {
    setBusy(true)
    try {
      await deleteMyStoreOrder(order._id)
      setDeleting(null)
      fetchOrders()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const getAvailableTransitions = (currentStatus: string) => {
    return validTransitions[currentStatus] || []
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SectionHeader title={t('seller.orders.title')} subtitle={t('seller.orders.subtitle')} />
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-ink-900/10" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title={t('seller.orders.title')} subtitle={t('seller.orders.subtitle')} />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-full sm:w-56"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === '' ? t('admin.all') : t(statusKey[opt.value] ?? opt.label)}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <Package size={48} className="mx-auto text-ink-400" />
          <h3 className="mt-4 text-lg font-semibold text-ink-900">{t('common.empty')}</h3>
          <p className="mt-1 text-ink-500">{t('seller.orders.noOrders')}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-ink-900/5">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.orders.orderRef')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.orders.customer')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.orders.items')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.orders.total')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.orders.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">{t('seller.orders.date')}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-ink-900/5">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-ink-900">{order.orderRef}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{order.customer.fullName}</p>
                      <p className="text-sm text-ink-500">{order.customer.phone}</p>
                      <p className="text-xs text-ink-400">{order.customer.wilaya}, {order.customer.commune}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {item.image && <img src={item.image} alt={item.name} className="h-8 w-8 rounded object-cover" />}
                            <span className="text-ink-700">{item.name} x{item.qty}</span>
                            <span className="text-ink-500">{formatPrice(item.price * item.qty, lang)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-ink-900">{formatPrice(order.total, lang)}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-500">
                      {new Date(order.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-700"
                          disabled={getAvailableTransitions(order.status).length === 0}
                        >
                          {getAvailableTransitions(order.status).map((status) => (
                            <option key={status} value={status}>{t(statusKey[status] ?? status)}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="icon-btn text-ink-400 hover:text-brand-600"
                          aria-label={t('seller.orders.view')}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(order)}
                          className="icon-btn text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                          aria-label={t('seller.orders.delete')}
                          title={t('seller.orders.delete')}
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
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('seller.orders.deleteTitle')}
        description={t('seller.orders.deleteDesc')}
        confirmLabel={t('seller.orders.delete')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        danger
        onConfirm={() => { if (deleting) void handleDelete(deleting) }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}