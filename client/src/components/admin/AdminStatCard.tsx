import type { LucideIcon } from 'lucide-react'

interface AdminStatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  trend?: { value: string; positive: boolean }
  href?: string
}

export default function AdminStatCard({ icon: Icon, label, value, trend, href }: AdminStatCardProps) {

  const content = (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
          {trend && (
            <p className="mt-2 flex items-center gap-1 text-sm">
              <span className={`font-semibold ${trend.positive ? 'text-success-600' : 'text-danger-600'}`}>
                {trend.value}
              </span>
              <span className="text-ink-500">vs last period</span>
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          <Icon size={22} aria-hidden="true" />
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="block hover:shadow-md transition-shadow">
        {content}
      </a>
    )
  }

  return content
}