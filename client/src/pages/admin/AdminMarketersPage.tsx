import { useState, useEffect, useMemo } from 'react'
import { ExternalLink, Eye, Trash2 } from 'lucide-react'
import { formatPrice } from '../../components/common/Price'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminDataTable, { type Column } from '../../components/admin/AdminDataTable'
import LoadingState from '../../components/admin/LoadingState'
import ErrorState from '../../components/admin/ErrorState'
import EmptyState from '../../components/admin/EmptyState'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import AdminDashboardLayout from '../../components/admin/AdminDashboardLayout'
import { Users, Search as SearchIcon } from 'lucide-react'

interface AdminMarketer {
  id: string
  name: string
  email: string
  avatar: string | null
  createdAt: string
  profile: {
    _id: string
    user: string
    referralCode: string
    status: string
    publicName: string
    totalEarnings: number
    payoutDetails: { ccp?: string; baridiMob?: string }
  } | null
  stats: {
    visits: number
    commission: { pending?: number; approved?: number; paid?: number; cancelled?: number }
  }
}

export default function AdminMarketersPage() {
  const { t, lang } = useLanguage()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [allMarketers, setAllMarketers] = useState<AdminMarketer[]>([])
  const [deleting, setDeleting] = useState<AdminMarketer | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteNotice, setDeleteNotice] = useState('')

  const fetchMarketers = async () => {
    const res = await api.getAdminMarketers()
    return res
  }

  const { data, loading, error, reload } = useAsync(fetchMarketers)

  useEffect(() => {
    if (data?.marketers) {
      setAllMarketers(data.marketers)
    }
  }, [data])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const filteredMarketers = allMarketers.filter((m: AdminMarketer) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.profile?.referralCode?.toLowerCase().includes(q)
    )
  })

  const paginatedMarketers = filteredMarketers.slice((page - 1) * 10, page * 10)
  const totalPagesFiltered = Math.ceil(filteredMarketers.length / 10)

  const availableBalance = (m: AdminMarketer) => {
    const c = m.stats?.commission || {}
    return (c.pending || 0) + (c.approved || 0)
  }

  const paidAmount = (m: AdminMarketer) => {
    const c = m.stats?.commission || {}
    return c.paid || 0
  }

  const columns = useMemo<Column<AdminMarketer>[]>(() => [
    {
      key: 'avatar',
      header: '',
      render: (m) => (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-medium">
          {m.avatar ? (
            <img src={m.avatar} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            m.name.charAt(0).toUpperCase()
          )}
        </div>
      ),
      className: 'w-12',
    },
    {
      key: 'name',
      header: t('admin.name'),
      render: (m) => (
        <div>
          <p className="font-semibold text-ink-900">{m.profile?.publicName || m.name}</p>
          <p className="text-xs text-ink-500">{m.name}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'email',
      header: t('admin.email'),
      render: (m) => <span className="text-ink-500">{m.email}</span>,
      sortable: true,
    },
    {
      key: 'referralCode',
      header: t('admin.referralCode'),
      render: (m) => (
        <span className="font-mono text-xs uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
          {m.profile?.referralCode || '—'}
        </span>
      ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'visits',
      header: t('admin.visits'),
      render: (m) => <span className="font-medium text-ink-900">{m.stats?.visits || 0}</span>,
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'referralOrders',
      header: t('admin.referralOrders'),
      render: (m) => {
        const c = m.stats?.commission || {}
        const total = (c.pending || 0) + (c.approved || 0) + (c.paid || 0) + (c.cancelled || 0)
        return <span className="font-medium text-ink-900">{total}</span>
      },
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'deliveredOrders',
      header: t('admin.deliveredOrders'),
      render: (m) => {
        const c = m.stats?.commission || {}
        return <span className="font-medium text-ink-900">{c.approved || 0}</span>
      },
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'totalEarnings',
      header: t('admin.totalEarnings'),
      render: (m) => <span className="font-semibold text-ink-900">{formatPrice(m.profile?.totalEarnings || 0, lang)}</span>,
      className: 'text-right',
      headerClassName: 'text-right',
      sortable: true,
    },
    {
      key: 'availableBalance',
      header: t('admin.availableBalance'),
      render: (m) => <span className="font-semibold text-success-700">{formatPrice(availableBalance(m), lang)}</span>,
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      key: 'paidAmount',
      header: t('admin.paidAmount'),
      render: (m) => <span className="font-medium text-ink-500">{formatPrice(paidAmount(m), lang)}</span>,
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      key: 'status',
      header: t('admin.marketingStatus'),
      render: (m) => (
        <StatusBadge status={m.profile?.status || 'suspended'} />
      ),
      className: 'text-center',
      headerClassName: 'text-center',
    },
    {
      key: 'actions',
      header: '',
      render: (m) => (
        <div className="flex items-center justify-end gap-2">
          {m.profile && (
            <button
              type="button"
              onClick={() => reload()}
              className="icon-btn text-ink-400 hover:bg-brand-50 hover:text-brand-600"
              aria-label={t('common.refresh')}
            >
              <ExternalLink size={17} />
            </button>
          )}
          {m.profile && (
            <button
              type="button"
              onClick={() => {
                // TODO: navigate to marketer details
              }}
              className="icon-btn text-ink-400 hover:bg-ink-900/5 hover:text-ink-600"
              aria-label={t('admin.viewDetails')}
            >
              <Eye size={17} />
            </button>
          )}
          {m.profile && (
            <button
              type="button"
              onClick={() => setDeleting(m)}
              className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
              aria-label={t('common.remove')}
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      ),
      className: 'w-40',
    },
  ], [t, lang, reload])

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.deleteMarketer(deleting.id)
      setDeleting(null)
      setDeleteNotice(t('admin.marketerDeleted'))
      void reload()
    } catch (err) {
      setDeleteNotice(getErrorMessage(err))
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) {
    return (
      <AdminDashboardLayout
        pageTitle={t('admin.tabs.marketers')}
        pageSubtitle={t('admin.marketersSubtitle')}
      >
        <LoadingState fullPage />
      </AdminDashboardLayout>
    )
  }

  if (error) {
    return (
      <AdminDashboardLayout
        pageTitle={t('admin.tabs.marketers')}
        pageSubtitle={t('admin.marketersSubtitle')}
      >
        <ErrorState message={error} onRetry={reload} />
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout
      pageTitle={t('admin.tabs.marketers')}
      pageSubtitle={t('admin.marketersSubtitle')}
      pageAction={
        <div className="relative max-w-sm">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchMarketers')}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-line bg-surface text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            aria-label={t('admin.searchMarketers')}
          />
        </div>
      }
    >
      {deleteNotice && (
        <div className="mb-4 rounded-xl border border-success-200 bg-success-50 p-4">
          <p className="text-sm text-success-700">{deleteNotice}</p>
        </div>
      )}

      {paginatedMarketers.length > 0 ? (
        <AdminDataTable
          columns={columns}
          data={paginatedMarketers}
          keyExtractor={(m) => m.id}
          loading={false}
          pagination={{
            page,
            pages: totalPagesFiltered,
            onPageChange: setPage,
          }}
        />
      ) : (
        <EmptyState
          icon={Users}
          title={t('admin.noMarketers')}
          description={debouncedSearch ? t('admin.noMarketersSearchDesc') : t('admin.noMarketersDesc')}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.deleteMarketerTitle')}
        description={t('admin.deleteMarketerDesc')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </AdminDashboardLayout>
  )
}