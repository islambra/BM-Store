import { useState } from 'react'
import { Link2, Megaphone, Phone, Trash2, Wallet } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'
import { formatPrice } from '../common/Price'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

function MarketerStatus({ status }: { status: string }) {
  const { t } = useLanguage()
  return status === 'active' ? (
    <Badge tone="ok">{t('marketer.statusActive')}</Badge>
  ) : (
    <Badge tone="warn">{t('marketer.statusSuspended')}</Badge>
  )
}

export default function MarketersSection() {
  const { t, lang } = useLanguage()
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

  const actions = (m: api.AdminMarketer) => (
    <div className="flex items-center justify-end gap-2">
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
  )

  return (
    <>
      {notice && <ErrorNote message={notice} />}
      {marketers.length === 0 ? (
        <EmptyState icon={Megaphone} title={t('common.empty')} description={t('admin.empty')} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
        {marketers.map((m) => (
          <div key={m.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Megaphone size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{m.profile?.publicName ?? m.name}</p>
                  <p className="flex items-center gap-1 text-xs text-ink-400">
                    <Phone size={11} />
                    <span dir="ltr">{m.phone ?? '—'}</span>
                  </p>
                </div>
              </div>
              {m.profile && <MarketerStatus status={m.profile.status} />}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-canvas px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-ink-400">
                <Link2 size={12} />
                {t('admin.referralCode')}
              </span>
              <span className="font-mono text-xs font-bold uppercase text-brand-700">{m.profile?.referralCode ?? '—'}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line px-3 py-2">
                <p className="text-xs text-ink-400">{t('admin.visits')}</p>
                <p className="mt-0.5 text-sm font-bold text-ink-900">{m.stats?.visits ?? 0}</p>
              </div>
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
                <p className="flex items-center gap-1 text-xs text-brand-700">
                  <Wallet size={12} />
                  {t('marketer.availableBalance')}
                </p>
                <p className="mt-0.5 text-sm font-bold text-brand-900">{formatPrice(m.stats?.availableBalance ?? 0, lang)}</p>
              </div>
            </div>
            <div className="mt-3 border-t border-line pt-3">
              {actions(m)}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table headers={[t('admin.name'), t('admin.phone'), t('admin.referralCode'), t('admin.visits'), t('marketer.availableBalance'), t('admin.marketingStatus')]}>
          {marketers.map((m) => (
            <tr key={m.id} className="hover:bg-canvas">
              <td className="px-4 py-3">
                <p className="font-semibold text-ink-900">{m.profile?.publicName ?? m.name}</p>
              </td>
              <td className="px-4 py-3 text-ink-500" dir="ltr">{m.phone ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-xs uppercase text-brand-700">{m.profile?.referralCode ?? '—'}</td>
              <td className="px-4 py-3 text-ink-500">{m.stats?.visits ?? 0}</td>
              <td className="px-4 py-3 font-semibold text-ink-900">{formatPrice(m.stats?.availableBalance ?? 0, lang)}</td>
              <td className="px-4 py-3">
                {m.profile ? <MarketerStatus status={m.profile.status} /> : <Badge tone="muted">—</Badge>}
              </td>
              <td className="px-4 py-3">
                {actions(m)}
              </td>
            </tr>
          ))}
        </Table>
        </div>
        </>
      )}

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