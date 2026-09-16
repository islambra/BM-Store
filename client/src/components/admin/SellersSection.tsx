import { useEffect, useState } from 'react'
import { Boxes, ChevronLeft, ChevronRight, ClipboardList, Mail, Phone, Search, Store, Trash2 } from 'lucide-react'
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

function SellerBadges({ s }: { s: api.AdminSellerRecord }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge tone={sellerStatusTone(s.status)}>
        {s.status === 'active' ? t('marketer.statusActive') : s.status === 'suspended' ? t('admin.statusSuspended') : s.status}
      </Badge>
      {s.store && (
        <Badge tone={storeStatusTone(s.store.status)}>
          {s.store.status === 'active' ? t('admin.sellers.storeActive') : s.store.status}
        </Badge>
      )}
    </div>
  )
}

function StoreSubscription({ s }: { s: api.AdminSellerRecord }) {
  const { t } = useLanguage()
  if (!s.store) return <span className="text-ink-400">—</span>
  return (
    <span className="space-y-0.5">
      <span className="block text-sm font-semibold text-ink-900">
        {t(s.store.subscriptionPlan === 'monthly' ? 'seller.monthlyPlan' : 'seller.yearlyPlan')}
      </span>
      {s.store.status === 'deleted' ? (
        <span className="block text-xs font-medium text-red-600">{t('admin.sellers.statusDeleted')}</span>
      ) : s.store.isExpired ? (
        <span className="block text-xs font-medium text-red-600">{t('admin.sellers.statusExpired')}</span>
      ) : (
        <span className="block text-xs text-ink-500">
          {s.store.daysRemaining} {t('admin.sellers.daysRemaining')}
        </span>
      )}
    </span>
  )
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
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={t('admin.sellers.search')}
            className="ps-9"
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
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {sellers.map((s) => (
              <div key={s._id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Store size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900">{s.fullName}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-ink-400" dir="ltr">
                        <Mail size={11} />
                        {s.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleting(s)}
                    className="icon-btn shrink-0 text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                    aria-label={t('admin.sellers.delete')}
                    title={t('admin.sellers.delete')}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {s.store && (
                  <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                    <p className="font-bold text-ink-900">{s.store.name}</p>
                    <p className="font-mono text-xs text-brand-700" dir="ltr">/{s.store.slug}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StoreSubscription s={s} />
                      <SellerBadges s={s} />
                    </div>
                  </div>
                )}
                {!s.store && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-canvas p-3">
                    <span className="text-xs text-ink-400">{t('admin.sellers.store')}</span>
                    <SellerBadges s={s} />
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-ink-400">
                      <Boxes size={12} />
                      {t('admin.sellers.products')}
                    </span>
                    <span className="text-sm font-bold text-ink-900">{s.stats.totalProducts}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-ink-400">
                      <ClipboardList size={12} />
                      {t('admin.sellers.orders')}
                    </span>
                    <span className="text-sm font-bold text-ink-900">{s.stats.totalOrders}</span>
                  </div>
                </div>

                <p className="mt-2 flex items-center gap-1 text-xs text-ink-400">
                  <Phone size={11} />
                  <span dir="ltr">{s.phone}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
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
                  <td className="px-4 py-3"><StoreSubscription s={s} /></td>
                  <td className="px-4 py-3 text-ink-500">{s.stats.totalProducts}</td>
                  <td className="px-4 py-3 text-ink-500">{s.stats.totalOrders}</td>
                  <td className="px-4 py-3"><SellerBadges s={s} /></td>
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
          </div>

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