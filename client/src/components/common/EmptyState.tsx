import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon size={30} />
      </span>
      <h3 className="text-lg font-bold text-ink-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}