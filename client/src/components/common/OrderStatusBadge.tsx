import { useLanguage } from '../../context/LanguageContext'

export const statusKey: Record<string, string> = {
  'pending-review': 'order.pendingReview',
  'customer-contacted': 'order.customerContacted',
  confirmed: 'order.confirmed',
  processing: 'order.processing',
  shipped: 'order.shipped',
  delivered: 'order.delivered',
  rejected: 'order.rejected',
  cancelled: 'order.cancelled',
}

const toneCls: Record<string, string> = {
  'pending-review': 'bg-warning-50 text-warning-700 ring-warning-100',
  'customer-contacted': 'bg-brand-50 text-brand-700 ring-brand-100',
  confirmed: 'bg-success-50 text-success-700 ring-success-100',
  processing: 'bg-brand-50 text-brand-700 ring-brand-100',
  shipped: 'bg-brand-100 text-brand-800 ring-brand-200',
  delivered: 'bg-success-50 text-success-700 ring-success-100',
  rejected: 'bg-danger-50 text-danger-700 ring-danger-100',
  cancelled: 'bg-ink-900/5 text-ink-500 ring-ink-900/5',
}

export default function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${toneCls[status] ?? toneCls['pending-review']}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(statusKey[status] ?? 'order.pendingReview')}
    </span>
  )
}