import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Icon size={22} />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-500 sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  )
}