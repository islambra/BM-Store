import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Store } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Badge, ErrorNote, Loader, Table } from './adminShared'
import { Input } from '../common/FormControls'
import EmptyState from '../common/EmptyState'
import ConfirmDialog from '../common/ConfirmDialog'
import { storeVisitUrl, storeDomainSuffix } from '../../utils/storeUrl'

const LIMIT = 15

const storeTone = (status: string): 'ok' | 'warn' | 'muted' =>
  status === 'active' ? 'ok' : status === 'suspended' ? 'warn' : 'muted'

const storeStatusLabel = (status: string, t: (key: string) => string) => {
  switch (status) {
    case 'active': return t('seller.subscription.active')
    case 'suspended': return t('admin.statusSuspended')
    case 'expired': return t('seller.subscription.expired')
    case 'pending': return t('admin.statusPending')
    default: return status
  }
}

const sellerName = (s: api.AdminStoreRecord): string => {
  if (!s.seller) return '—'
  return typeof s.seller === 'string' ? s.seller : s.seller.fullName
}

export default function StoresSection() {
  const { t } = useLanguage()
  const [stores, setStores] = useState<api.AdminStoreRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [toSuspend, setToSuspend] = useState<api.AdminStoreRecord | null>(null)
  const [toActivate, setToActivate] = useState<api.AdminStoreRecord | null>(null)
  const [busy, setBusy] = useState(false)

  const fetchList = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.adminListStores({ page, limit: LIMIT, q: search || undefined })
      setStores(res.stores)
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

  const confirmSuspend = async () => {
    if (!toSuspend) return
    setBusy(true)
    setNotice('')
    try {
      await api.adminSuspendStore(toSuspend._id)
      setToSuspend(null)
      setNotice(t('admin.seller.storeSuspendedNotice'))
      void fetchList()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmActivate = async () => {
    if (!toActivate) return
    setBusy(true)
    setNotice('')
    try {
      await api.adminActivateStore(toActivate._id)
      setToActivate(null)
      setNotice(t('admin.seller.storeActivatedNotice'))
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
        <p className="text-sm text-ink-600">{t('admin.stores.search')}</p>
        <div className="relative w-full sm:w-72">
<Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="ps-9"
          />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorNote message={error} />
      ) : stores.length === 0 ? (
        <EmptyState icon={Store} title={t('common.empty')} description={t('admin.empty')} />
      ) : (
        <>
          <Table headers={[t('admin.stores.name'), t('admin.stores.seller'), t('admin.stores.url'), t('admin.stores.plan'), t('admin.stores.status'), t('admin.stores.products')]}>
            {stores.map((s) => (
              <tr key={s._id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{s.name}</p>
                  {s.subscriptionEndDate && (
                    <p className="text-xs text-ink-400" dir="ltr">
                      {new Date(s.subscriptionEndDate).toLocaleDateString()}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-500">{sellerName(s)}</td>
                <td className="px-4 py-3">
                  <a
                    href={storeVisitUrl(s.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-brand-700 hover:text-brand-800 hover:underline"
                    dir="ltr"
                  >
                    {s.slug}{storeDomainSuffix()}
                  </a>
                </td>
                <td className="px-4 py-3">{s.subscriptionPlan ? t(s.subscriptionPlan === 'monthly' ? 'seller.monthlyPlan' : 'seller.yearlyPlan') : '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={storeTone(s.status)}>{storeStatusLabel(s.status, t)}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-500">{s.stats.totalProducts}</td>
                <td className="px-4 py-3 text-end">
                  <div className="flex items-center justify-end gap-2">
                    {s.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setToSuspend(s)}
                        className="btn-secondary text-danger-700"
                      >
                        {t('admin.stores.suspend')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setToActivate(s)}
                        className="btn-primary"
                      >
                        {t('admin.stores.activate')}
                      </button>
                    )}
                  </div>
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
        </>
      )}

      <ConfirmDialog
        open={Boolean(toSuspend)}
        title={t('admin.seller.suspendTitle')}
        description={t('admin.seller.suspendDesc')}
        confirmLabel={t('admin.stores.suspend')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={() => void confirmSuspend()}
        onCancel={() => setToSuspend(null)}
      />

      <ConfirmDialog
        open={Boolean(toActivate)}
        title={t('admin.seller.activateTitle')}
        description={t('admin.seller.activateDesc')}
        confirmLabel={t('admin.stores.activate')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        danger={false}
        onConfirm={() => void confirmActivate()}
        onCancel={() => setToActivate(null)}
      />
    </div>
  )
}