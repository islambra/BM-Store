import { useState } from 'react'
import { Search, Trash2, Users } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import { formatPrice } from '../common/Price'
import { Input } from '../common/FormControls'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

const roleLabel: Record<string, string> = {
  USER: 'account.roleUser',
  MARKETER: 'account.roleMarketer',
  ADMIN: 'account.roleAdmin',
}

export default function CustomersSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminUsers())
  const [deleting, setDeleting] = useState<api.AdminUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const users = (data?.users ?? []).filter((u) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [u.name, u.phone, u.email].some((v) => (v ?? '').toLowerCase().includes(q))
  })

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setNotice('')
    try {
      await api.deleteAdminUser(deleting._id)
      setDeleting(null)
      setNotice(t('admin.userDeleted'))
      void reload()
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
        <p className="text-sm text-ink-600">{t('admin.customers.search')}</p>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.customers.search')}
            className="pl-9"
          />
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title={t('common.empty')} description={t('admin.empty')} />
      ) : (
        <>
          <Table headers={[t('admin.name'), t('admin.phone'), t('admin.role'), t('admin.ordersCount'), t('admin.totalSpent'), t('admin.joined')]}>
            {users.map((u) => (
              <tr key={String(u._id)} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                        {(u.name?.trim()[0] ?? '?').toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{u.name}</p>
                      {u.email && <p className="truncate text-xs text-ink-400" dir="ltr">{u.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-500" dir="ltr">{u.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone="muted">{t(roleLabel[u.role] ?? u.role)}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-500">{u.orderCount ?? 0}</td>
                <td className="px-4 py-3 font-semibold text-ink-900">{formatPrice(u.totalSpent ?? 0, lang)}</td>
                <td className="px-4 py-3 text-ink-500">{new Date(u.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-GB')}</td>
                <td className="px-4 py-3 text-end">
                  <button
                    type="button"
                    onClick={() => setDeleting(u)}
                    className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                    aria-label={t('common.remove')}
                    title={t('common.remove')}
                  >
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.deleteUserTitle')}
        description={t('admin.deleteUserDesc')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}