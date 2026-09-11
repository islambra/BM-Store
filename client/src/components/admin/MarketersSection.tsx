import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

export default function MarketersSection() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminMarketers())
  const [deleting, setDeleting] = useState<api.AdminMarketer | null>(null)
  const [busyId, setBusyId] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  const marketers = data?.marketers ?? []

  const toggleStatus = async (item: api.AdminMarketer, current: string) => {
    if (!item.profile) return
    setBusyId(item.id)
    setNotice('')
    try {
      await api.updateMarketerStatus(item.profile._id, current === 'active' ? 'suspended' : 'active')
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusyId('')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await api.deleteMarketer(deleting.id)
      setDeleting(null)
      setNotice(t('admin.marketerDeleted'))
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
      <Table headers={[t('admin.name'), t('admin.phone'), t('admin.referralCode'), t('admin.visits'), t('admin.marketingStatus')]}>
        {marketers.map((m) => (
          <tr key={m.id} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <p className="font-semibold text-ink-900">{m.profile?.publicName ?? m.name}</p>
            </td>
            <td className="px-4 py-3 text-ink-500" dir="ltr">{m.phone ?? '—'}</td>
            <td className="px-4 py-3 font-mono text-xs uppercase text-brand-700">{m.profile?.referralCode ?? '—'}</td>
            <td className="px-4 py-3 text-ink-500">{m.stats?.visits ?? 0}</td>
            <td className="px-4 py-3">
              {m.profile ? (
                <Badge tone={m.profile.status === 'active' ? 'ok' : 'warn'}>
                  {m.profile.status === 'active' ? t('marketer.statusActive') : t('marketer.statusSuspended')}
                </Badge>
              ) : (
                <Badge tone="muted">—</Badge>
              )}
            </td>
            <td className="px-4 py-3 text-end">
              <div className="flex items-center justify-end gap-2">
                <Link to={`/admin/marketers/${m.id}`} className="icon-btn text-ink-400 hover:bg-brand-50 hover:text-brand-600" aria-label={t('admin.viewDetails')}>
                  <Eye size={17} />
                </Link>
                {m.profile && (
                  <button
                    type="button"
                    onClick={() => void toggleStatus(m, m.profile!.status)}
                    disabled={busyId === m.id}
                    className={m.profile.status === 'active' ? 'btn-secondary text-danger-700' : 'btn-primary'}
                  >
                    {m.profile.status === 'active' ? t('admin.suspend') : t('admin.activate')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleting(m)}
                  className="icon-btn text-ink-400 hover:bg-danger-50 hover:text-danger-600"
                  aria-label={t('common.remove')}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('admin.deleteMarketerTitle')}
        description={t('admin.deleteMarketerDesc')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}