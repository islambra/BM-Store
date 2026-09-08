import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface AdminTab {
  id: string
  label: string
  icon: LucideIcon
}

export default function AdminShell({
  tabs,
  active,
  onNavigate,
  children,
}: {
  tabs: AdminTab[]
  active: string
  onNavigate: (id: string) => void
  children: ReactNode
}) {
  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <div className="mb-6 flex gap-1 overflow-x-auto pb-1 no-scrollbar lg:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onNavigate(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active === tab.id ? 'bg-brand-600 text-white' : 'bg-surface text-ink-700 hover:bg-ink-900/5'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      <aside className="hidden lg:block">
        <nav className="sticky top-32 rounded-2xl border border-line bg-surface p-3">
          <ul className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active === tab.id ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-900/5'
                  }`}
                >
                  <tab.icon size={17} />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="mt-6 space-y-5 lg:mt-0">{children}</div>
    </div>
  )
}