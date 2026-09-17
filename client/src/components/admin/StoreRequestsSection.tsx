import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Check, Store, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Badge, ErrorNote, Loader, Table } from './adminShared'
import ConfirmDialog from '../common/ConfirmDialog'
import EmptyState from '../common/EmptyState'

const LIMIT = 15

const requestTone = (status: string): 'ok' | 'warn' | 'muted' =>
  status === 'pending' ? 'warn' : status === 'approved' ? 'ok' : 'muted'

function RejectModal({
  reason,
  onReasonChange,
  busy,
  onConfirm,
  onCancel,
}: {
  reason: string
  onReasonChange: (v: string) => void
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onCancel])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('admin.seller.rejectTitle')}
      className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
    >
      <div className="absolute inset-0 animate-fade-in bg-ink-900/70 backdrop-blur-lg" onClick={onCancel} />
      <div className="relative w-full max-w-sm animate-pop overflow-hidden rounded-3xl border border-white/10 bg-surface p-7 shadow-lift">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
            <X size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug text-ink-900">{t('admin.seller.rejectTitle')}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t('admin.seller.rejectDesc')}</p>
          </div>
        </div>
        <div className="mt-5">
          <label className="text-xs font-bold text-ink-600">{t('admin.seller.rejectReasonLabel')}</label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={t('admin.seller.rejectReasonPlaceholder')}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost w-full sm:w-auto">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn-danger w-full sm:w-auto">
            {busy ? `${t('admin.storeRequests.reject')}…` : t('admin.storeRequests.reject')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ProofModal({ url, onClose }: { url: string; onClose: () => void }) {
  const { t } = useLanguage()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('admin.storeRequests.proof')}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 animate-fade-in bg-ink-900/80 backdrop-blur-lg" onClick={onClose} />
      <div className="relative flex w-full max-w-3xl animate-pop flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-lift">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-base font-bold text-ink-900">{t('admin.storeRequests.proof')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="btn-ghost btn-sm inline-flex items-center gap-1">
            <X size={16} />
            {t('common.close')}
          </button>
        </div>
        <div className="max-h-[75vh] overflow-auto bg-canvas/60 p-4">
          <img src={url} alt={t('admin.storeRequests.proof')} className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain" />
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function StoreRequestsSection() {
  const { t } = useLanguage()
  const [requests, setRequests] = useState<api.AdminStoreRequestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [toApprove, setToApprove] = useState<api.AdminStoreRequestRecord | null>(null)
  const [toReject, setToReject] = useState<api.AdminStoreRequestRecord | null>(null)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)

  const fetchList = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.adminListStoreRequests({ page, limit: LIMIT, status: 'pending' })
      setRequests(res.requests)
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
  }, [page])

  const confirmApprove = async () => {
    if (!toApprove) return
    setBusy(true)
    setNotice('')
    try {
      await api.adminApproveStoreRequest(toApprove._id)
      setToApprove(null)
      setNotice(t('admin.seller.requestApprovedNotice'))
      void fetchList()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmReject = async () => {
    if (!toReject) return
    setBusy(true)
    setNotice('')
    try {
      await api.adminRejectStoreRequest(toReject._id, rejectReason.trim() || undefined)
      setToReject(null)
      setRejectReason('')
      setNotice(t('admin.seller.requestRejectedNotice'))
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

      {loading ? (
        <Loader />
      ) : error ? (
        <ErrorNote message={error} />
      ) : requests.length === 0 ? (
        <EmptyState icon={Store} title={t('common.empty')} description={t('admin.empty')} />
      ) : (
        <>
          <Table headers={[t('admin.storeRequests.seller'), t('admin.storeRequests.store'), t('admin.storeRequests.url'), t('admin.storeRequests.plan'), t('admin.storeRequests.amount'), t('admin.storeRequests.status')]}>
            {requests.map((r) => (
              <tr key={r._id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{r.sellerName}</p>
                  <p className="text-xs text-ink-400" dir="ltr">{r.sellerPhone}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{r.storeName}</p>
                  {r.isRenewal && (
                    <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                      {t('seller.subscription.renewal')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500" dir="ltr">/{r.slug}</td>
                <td className="px-4 py-3">{t(r.subscriptionPlan === 'monthly' ? 'seller.monthlyPlan' : 'seller.yearlyPlan')}</td>
                <td className="px-4 py-3 font-bold text-ink-900">{r.expectedAmount.toLocaleString()} DA</td>
                <td className="px-4 py-3">
                  <Badge tone={requestTone(r.status)}>
                    {r.status === 'pending' ? t('admin.statusPending') : r.status === 'approved' ? t('admin.storeRequests.approve') : t('admin.storeRequests.reject')}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex items-center justify-end gap-2">
                    {r.paymentProof && (
                      <button
                        type="button"
                        onClick={() => setProofUrl(r.paymentProof)}
                        className="btn-secondary"
                      >
                        {t('admin.storeRequests.proof')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setToApprove(r)}
                      className="btn-primary"
                    >
                      <Check size={15} />
                      {t('admin.storeRequests.approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setToReject(r)}
                      className="btn-secondary text-danger-700"
                    >
                      {t('admin.storeRequests.reject')}
                    </button>
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
        open={Boolean(toApprove)}
        title={t('admin.seller.approveTitle')}
        description={t('admin.seller.approveDesc')}
        confirmLabel={t('admin.storeRequests.approve')}
        cancelLabel={t('common.cancel')}
        busy={busy}
        danger={false}
        onConfirm={() => void confirmApprove()}
        onCancel={() => setToApprove(null)}
      />

      {toReject && (
        <RejectModal
          reason={rejectReason}
          onReasonChange={setRejectReason}
          busy={busy}
          onConfirm={() => void confirmReject()}
          onCancel={() => { setToReject(null); setRejectReason('') }}
        />
      )}

      {proofUrl && <ProofModal url={proofUrl} onClose={() => setProofUrl(null)} />}
    </div>
  )
}