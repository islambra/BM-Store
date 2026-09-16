import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Store, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Badge, ErrorNote, Loader, Table } from './adminShared'
import { Input } from '../common/FormControls'
import EmptyState from '../common/EmptyState'
import ConfirmDialog from '../common/ConfirmDialog'

const LIMIT = 15

const sellerStatusTone = (status: string): 'ok' | 'warn' | 'muted' =>
  status === 'active' ? 'ok' : status === 'suspended' ? 'warn' : 'muted'

const storeStatusTone = (status: string): 'ok' | 'warn' | 'muted' | 'danger' => {
  if (status === 'active') return 'ok'
  if (status === 'expired' || status === 'deleted') return 'danger'
  if (status === 'suspended') return 'warn'
  return 'muted'
}

export default function SellersSection() {
  const { t } = useLanguage()
  const [sellers, setSellers] = useState<api.AdminSellerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [deleting, setDeleting] = useState<api.AdminSellerRecord | null>(null)
  const [busy, setBusy] = useState(false)

  const fetchList = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.adminListSellers({ page, limit: LIMIT, q: search || undefined })
      setSellers(res.sellers)
      setPages(res.pages)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search])

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setNotice('')
    try {
      await api.adminDeleteSeller(deleting._id)
      setNotice(t('admin.sellers.deleted'))
      setDeleting(null)
      void fetchList()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {notice && <ErrorNote message={notice} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-600">{t('admin.sellers.search')}</p>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('admin.sellers.search')}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorNote message={error} />
      ) : sellers.length === 0 ? (
        <EmptyState icon={Store} title={t('common.empty')} description={t('admin.empty')} />
      ) : (
        <>
          <Table headers={[t('admin.sellers.name'), t('admin.sellers.phone'), t('admin.sellers.store'), t('admin.sellers.subscription'), t('admin.sellers.products'), t('admin.sellers.orders'), t('admin.sellers.status'), t('admin.sellers.actions')]}>
            {sellers.map((s) => (
              <tr key={s._id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{s.fullName}</p>
                  <p className="text-xs text-ink-400" dir="ltr">{s.email}</p>
                </td>
                <td className="px-4 py-3 text-ink-500" dir="ltr">{s.phone}</td>
                <td className="px-4 py-3">
                  {s.store ? (
                    <div>
                      <p className="font-semibold text-ink-900">{s.store.name}</p>
                      <p className="text-xs text-ink-400" dir="ltr">/{s.store.slug}</p>
                    </div>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.store ? (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-ink-900">{t(s.store.subscriptionPlan === 'monthly' ? 'seller.monthlyPlan' : 'seller.yearlyPlan')}</p>
                      {s.store.status === 'deleted' ? (
                        <p className="text-xs font-medium text-red-600">{t('admin.sellers.statusDeleted')}</p>
                      ) : s.store.isExpired ? (
                        <p className="text-xs font-medium text-red-600">{t('admin.sellers.statusExpired')}</p>
                      ) : (
                        <p className="text-xs text-ink-500">
                          {s.store.daysRemaining} {t('admin.sellers.daysRemaining')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-500">{s.stats.totalProducts}</td>
                <td className="px-4 py-3 text-ink-500">{s.stats.totalOrders}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <Badge tone={sellerStatusTone(s.status)}>
                      {s.status === 'active' ? t('marketer.statusActive') : s.status === 'suspended' ? t('admin.statusSuspended') : s.status}
                    </Badge>
                    {s.store && (
                      <Badge tone={storeStatusTone(s.store.status)}>
                        {s.store.status === 'active' ? t('admin.sellers.storeActive') : s.store.status}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-end">
                  <button
                    type="button"
                    onClick={() => setDeleting(s)}
                    className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                    aria-label={t('admin.sellers.delete')}
                    title={t('admin.sellers.delete')}
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="icon-btn disabled:opacity-40">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-ink-700">{page} / {pages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="icon-btn disabled:opacity-40">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          <ConfirmDialog
            open={!!deleting}
            title={t('admin.sellers.deleteTitle')}
            description={t('admin.sellers.deleteDesc', { name: deleting?.fullName ?? '' })}
            confirmLabel={t('common.remove')}
            cancelLabel={t('common.cancel')}
            busy={busy}
            danger
            onConfirm={() => void confirmDelete()}
            onCancel={() => { if (!busy) setDeleting(null) }}
          />
        </>
      )}
    </div>
  )
}