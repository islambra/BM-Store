import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import { formatPrice } from '../common/Price'
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

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

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
    <>
      {notice && <ErrorNote message={notice} />}
      <Table headers={[t('admin.name'), t('admin.email'), t('admin.role'), t('admin.ordersCount'), t('admin.totalSpent'), t('admin.joined')]}>
        {(data?.users ?? []).map((u) => (
          <tr key={String(u._id)} className="hover:bg-canvas">
            <td className="px-4 py-3 font-semibold text-ink-900">{u.name}</td>
            <td className="px-4 py-3 text-ink-500">{u.email}</td>
            <td className="px-4 py-3">
              <Badge tone="muted">{t(roleLabel[u.role] ?? u.role)}</Badge>
            </td>
            <td className="px-4 py-3 text-ink-500">{u.orderCount ?? 0}</td>
            <td className="px-4 py-3 font-semibold text-ink-900">{formatPrice(u.totalSpent ?? 0, lang)}</td>
            <td className="px-4 py-3 text-ink-500">{new Date(u.createdAt).toLocaleDateString()}</td>
            <td className="px-4 py-3 text-end">
              <button
                type="button"
                onClick={() => setDeleting(u)}
                className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                aria-label={t('common.remove')}
              >
                <Trash2 size={17} />
              </button>
            </td>
          </tr>
        ))}
      </Table>
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
    </>
  )
}