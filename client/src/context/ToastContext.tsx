import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Info, LogIn, TriangleAlert, X } from 'lucide-react'
import { useLanguage } from './LanguageContext'

type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
  action?: ToastAction
  duration?: number
}

interface Toast extends ToastInput {
  id: number
}

interface ToastContextValue {
  notify: (toast: ToastInput) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const TONES = {
  info: { icon: Info, wrap: 'bg-brand-50 text-brand-600' },
  success: { icon: Check, wrap: 'bg-success-50 text-success-600' },
  warning: { icon: TriangleAlert, wrap: 'bg-warning-50 text-warning-600' },
  error: { icon: TriangleAlert, wrap: 'bg-danger-50 text-danger-600' },
} as const

function ToastCard({
  toast,
  onDismiss,
  closeLabel,
}: {
  toast: Toast
  onDismiss: (id: number) => void
  closeLabel: string
}) {
  const tone = TONES[toast.tone ?? 'info']
  const Icon = tone.icon
  const action = toast.action

  return (
    <div className="pointer-events-auto w-full max-w-sm animate-pop overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-lift backdrop-blur">
      <div className="flex items-start gap-3 p-3.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.wrap}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{toast.description}</p>
          )}
          {action && (
            <button
              type="button"
              onClick={() => {
                action.onClick()
                onDismiss(toast.id)
              }}
              className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <LogIn size={13} />
              {action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label={closeLabel}
          className="-me-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-700"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (input: ToastInput) => {
      const id = ++idRef.current
      const duration = input.duration ?? 4500
      const toast: Toast = { tone: 'info', duration, ...input, id }
      setToasts((prev) => [...prev.slice(-3), toast])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      )
    },
    [dismiss],
  )

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      timers.current.clear()
    },
    [],
  )

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2.5 px-4"
        >
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} closeLabel={t('common.close')} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
