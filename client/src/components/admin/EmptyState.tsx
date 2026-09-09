import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface p-12 text-center ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-900/5 text-ink-400">
        <Icon size={32} aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}