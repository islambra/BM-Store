import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: 'brand' | 'green' | 'amber' | 'blue' | 'red' | 'purple'
  className?: string
}

const colorStyles = {
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function StatCard({ label, value, icon: Icon, color = 'brand', className }: StatCardProps) {
  return (
    <div className={cn('rounded-2xl border p-5', colorStyles[color], className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-ink-900">{value}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/50">
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}