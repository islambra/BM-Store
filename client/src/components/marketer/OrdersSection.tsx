import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { formatPrice } from '../common/Price'
import OrderStatusBadge from '../common/OrderStatusBadge'
import EmptyState from '../common/EmptyState'
import { CommissionStatusBadge } from './marketerShared'
import { ErrorNote, Loader, Table } from '../admin/adminShared'

interface OrdersPage {
  page: number
  limit: number
  total: number
  pages: number
  orders: api.MarketerOrderRecord[]
}

export default function OrdersSection() {
  const { t, lang } = useLanguage()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<OrdersPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    api
      .getMarketerOrders({ page, limit: 20 })
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [page])

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const orders = data.orders ?? []

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface">
        <EmptyState icon={ClipboardList} title={t('marketer.noOrders')} description={t('marketer.noOrdersDesc')} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Table headers={[t('marketer.order'), t('marketer.products'), t('common.date'), t('marketer.status'), t('common.total'), t('marketer.orderCommission')]}>
        {orders.map((o) => (
          <tr key={o.id} className="hover:bg-canvas">
            <td className="px-4 py-3 text-sm font-bold tabular-nums text-ink-900" dir="ltr">{o.orderRef}</td>
            <td className="px-4 py-3 text-xs text-ink-600">
              {(o.items ?? []).length === 0 ? (
                <span className="text-ink-400">—</span>
              ) : (
                <span>
                  {(o.items ?? []).slice(0, 2).map((it, i) => (
                    <span key={i} className="block max-w-44 truncate">
                      {it.name} <span className="tabular-nums text-ink-400">× {it.qty}</span>
                    </span>
                  ))}
                  {(o.items ?? []).length > 2 && (
                    <span className="text-ink-400">+{(o.items ?? []).length - 2}</span>
                  )}
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-ink-400">
              {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US')}
            </td>
            <td className="px-4 py-3">
              <OrderStatusBadge status={o.status} />
            </td>
            <td className="px-4 py-3 font-semibold text-ink-900">{formatPrice(o.total, lang)}</td>
            <td className="px-4 py-3">
              {o.commission ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-900">{formatPrice(o.commission.amount, lang)}</span>
                  <CommissionStatusBadge status={o.commission.status} />
                </div>
              ) : (
                <span className="text-ink-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {data.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-secondary btn-sm">
            {t('admin.previous')}
          </button>
          <span className="text-xs font-semibold text-ink-500">
            {page} / {data.pages}
          </span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary btn-sm">
            {t('admin.next')}
          </button>
        </div>
      )}
    </div>
  )
}