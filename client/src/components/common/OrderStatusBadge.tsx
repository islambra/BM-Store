import { useLanguage } from '../../context/LanguageContext'

export const statusKey: Record<string, string> = {
  pending: 'order.pending',
  confirmed: 'order.confirmed',
  delivered: 'order.delivered',
  rejected: 'order.rejected',
  cancelled: 'order.cancelled',
}

const toneCls: Record<string, string> = {
  pending: 'bg-warning-50 text-warning-700 ring-warning-100',
  confirmed: 'bg-brand-50 text-brand-700 ring-brand-100',
  delivered: 'bg-success-50 text-success-700 ring-success-100',
  rejected: 'bg-danger-50 text-danger-700 ring-danger-100',
  cancelled: 'bg-ink-900/5 text-ink-500 ring-ink-900/5',
}

export default function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${toneCls[status] ?? toneCls.pending}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(statusKey[status] ?? 'order.pending')}
    </span>
  )
}