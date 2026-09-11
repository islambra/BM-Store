import { useState, useEffect, useMemo } from 'react'
import { formatPrice } from '../../components/common/Price'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import AdminDataTable, { type Column } from '../../components/admin/AdminDataTable'
import LoadingState from '../../components/admin/LoadingState'
import ErrorState from '../../components/admin/ErrorState'
import EmptyState from '../../components/admin/EmptyState'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import AdminDashboardLayout from '../../components/admin/AdminDashboardLayout'
import { Users, Search as SearchIcon, Trash2 } from 'lucide-react'

interface AdminUser {
  _id: string
  name: string
  phone?: string
  role: string
  avatar?: string | null
  createdAt: string
  orderCount: number
  totalSpent: number
}

export default function AdminCustomersPage() {
  const { t, lang } = useLanguage()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteNotice, setDeleteNotice] = useState('')

  const fetchUsers = async () => {
    const res = await api.getAdminUsers()
    return res
  }

  const { data, loading, error, reload } = useAsync(fetchUsers)

  useEffect(() => {
    if (data?.users) {
      setAllUsers(data.users.filter((u: AdminUser) => u.role !== 'ADMIN'))
    }
  }, [data])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const filteredUsers = useMemo(() => {
    if (!debouncedSearch) return allUsers
    const q = debouncedSearch.toLowerCase()
    return allUsers.filter(
      (u: AdminUser) =>
        u.name.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    )
  }, [allUsers, debouncedSearch])

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * 10
    return filteredUsers.slice(start, start + 10)
  }, [filteredUsers, page])

  const totalPagesFiltered = Math.ceil(filteredUsers.length / 10)

  const columns = useMemo<Column<AdminUser>[]>(() => [
    {
      key: 'avatar',
      header: '',
      render: (u: AdminUser) => (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-medium">
          {u.avatar ? (
            <img src={u.avatar} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            u.name.charAt(0).toUpperCase()
          )}
        </div>
      ),
      className: 'w-12',
    },
    {
      key: 'name',
      header: t('admin.name'),
      render: (u: AdminUser) => (
        <div>
          <p className="font-semibold text-ink-900">{u.name}</p>
          <p className="text-xs text-ink-500 capitalize">{u.role}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'phone',
      header: t('admin.phone'),
      render: (u: AdminUser) => <span className="text-ink-500">{u.phone ?? '—'}</span>,
      sortable: true,
    },
    {
      key: 'ordersCount',
      header: t('admin.ordersCount'),
      render: (u: AdminUser) => <span className="font-medium text-ink-900">{u.orderCount}</span>,
      className: 'text-center',
      headerClassName: 'text-center',
      sortable: true,
    },
    {
      key: 'totalSpent',
      header: t('admin.totalSpent'),
      render: (u: AdminUser) => <span className="font-semibold text-ink-900">{formatPrice(u.totalSpent, lang)}</span>,
      className: 'text-right',
      headerClassName: 'text-right',
      sortable: true,
    },
    {
      key: 'joined',
      header: t('admin.joined'),
      render: (u: AdminUser) => <span className="text-ink-500">{new Date(u.createdAt).toLocaleDateString()}</span>,
      className: 'text-right',
      headerClassName: 'text-right',
      sortable: true,
    },
    {
      key: 'actions',
      header: '',
      render: (u: AdminUser) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setDeleting(u)}
            className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
            aria-label={t('common.remove')}
          >
            <Trash2 size={17} />
          </button>
        </div>
      ),
      className: 'w-16',
    },
  ], [t, lang])

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.deleteAdminUser(deleting._id)
      setDeleting(null)
      setDeleteNotice(t('admin.userDeleted'))
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
        pageTitle={t('admin.tabs.customers')}
        pageSubtitle={t('admin.customersSubtitle')}
      >
        <LoadingState fullPage />
      </AdminDashboardLayout>
    )
  }

  if (error) {
    return (
      <AdminDashboardLayout
        pageTitle={t('admin.tabs.customers')}
        pageSubtitle={t('admin.customersSubtitle')}
      >
        <ErrorState message={error} onRetry={reload} />
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout
      pageTitle={t('admin.tabs.customers')}
      pageSubtitle={t('admin.customersSubtitle')}
      pageAction={
        <div className="relative max-w-sm">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchCustomers')}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-line bg-surface text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            aria-label={t('admin.searchCustomers')}
          />
        </div>
      }
    >
      {deleteNotice && (
        <div className="mb-4 rounded-xl border border-success-200 bg-success-50 p-4">
          <p className="text-sm text-success-700">{deleteNotice}</p>
        </div>
      )}

      {paginatedUsers.length > 0 ? (
        <AdminDataTable
          columns={columns}
          data={paginatedUsers}
          keyExtractor={(u) => u._id}
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
          title={t('admin.noCustomers')}
          description={debouncedSearch ? t('admin.noCustomersSearchDesc') : t('admin.noCustomersDesc')}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.deleteUserTitle')}
        description={t('admin.deleteUserDesc')}
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