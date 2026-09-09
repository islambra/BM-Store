interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'outline'
  className?: string
}

const statusConfig: Record<string, { label: string; tone: 'ok' | 'warn' | 'muted' | 'danger' | 'info' }> = {
  active: { label: 'admin.statusActive', tone: 'ok' },
  suspended: { label: 'admin.statusSuspended', tone: 'warn' },
  pending: { label: 'admin.statusPending', tone: 'info' },
  'pending-review': { label: 'order.pendingReview', tone: 'info' },
  confirmed: { label: 'order.confirmed', tone: 'ok' },
  processing: { label: 'order.processing', tone: 'info' },
  shipped: { label: 'order.shipped', tone: 'info' },
  delivered: { label: 'order.delivered', tone: 'ok' },
  cancelled: { label: 'order.cancelled', tone: 'danger' },
  rejected: { label: 'order.rejected', tone: 'danger' },
  completed: { label: 'admin.statusCompleted', tone: 'ok' },
}

const toneStyles: Record<string, string> = {
  ok: 'bg-success-50 text-success-700 border-success-200',
  warn: 'bg-warning-50 text-warning-700 border-warning-200',
  muted: 'bg-ink-900/5 text-ink-500 border-ink-200',
  danger: 'bg-danger-50 text-danger-700 border-danger-200',
  info: 'bg-brand-50 text-brand-700 border-brand-200',
}

const outlineToneStyles: Record<string, string> = {
  ok: 'text-success-700 border-success-300 hover:bg-success-50',
  warn: 'text-warning-700 border-warning-300 hover:bg-warning-50',
  muted: 'text-ink-500 border-ink-300 hover:bg-ink-900/5',
  danger: 'text-danger-700 border-danger-300 hover:bg-danger-50',
  info: 'text-brand-700 border-brand-300 hover:bg-brand-50',
}

import { useLanguage } from '../../context/LanguageContext'

export default function StatusBadge({ status, variant = 'default', className = '' }: StatusBadgeProps) {
  const { t } = useLanguage()
  const config = statusConfig[status] || { label: status, tone: 'muted' }
  const tone = config.tone
  const label = t(config.label)

  if (variant === 'outline') {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${outlineToneStyles[tone]} ${className}`}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone]} ${className}`}
    >
      {label}
    </span>
  )
}