import type { ReactNode } from 'react'

export default function SectionHeader({
  title,
  subtitle,
  action,
  badge,
  accent = false,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  badge?: string
  /** Warm accent styling for deal/promotion sections */
  accent?: boolean
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          {accent && <span className="h-6 w-1 rounded-full bg-accent-500" />}
          <h2 className="section-heading">{title}</h2>
          {badge && (
            <span className={accent ? 'badge bg-accent-500 text-white' : 'badge bg-brand-50 text-brand-700'}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}