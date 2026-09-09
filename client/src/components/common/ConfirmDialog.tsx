import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  danger = true,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
  danger?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
    >
      <div className="absolute inset-0 animate-fade-in bg-ink-900/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md animate-pop rounded-2xl bg-surface p-6 shadow-lift">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            danger ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <AlertTriangle size={22} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink-900">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost sm:w-auto">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={danger ? 'btn-danger sm:w-auto' : 'btn-primary sm:w-auto'}
          >
            {busy ? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}