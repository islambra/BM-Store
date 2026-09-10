import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  icon,
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
  icon?: ReactNode
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
    >
      <div className="absolute inset-0 animate-fade-in bg-ink-900/70 backdrop-blur-lg" onClick={onCancel} />
      <div className="relative w-full max-w-sm animate-pop overflow-hidden rounded-3xl border border-white/10 bg-surface p-7 shadow-lift">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              danger ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-600'
            }`}
          >
            {icon ?? <AlertTriangle size={22} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug text-ink-900">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost w-full sm:w-auto">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={danger ? 'btn-danger w-full sm:w-auto' : 'btn-primary w-full sm:w-auto'}
          >
            {busy ? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}