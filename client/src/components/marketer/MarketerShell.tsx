import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export interface MarketerTab {
  id: string
  labelKey: string
  icon: LucideIcon
}

export default function MarketerShell({
  tabs,
  active,
  onSelect,
  children,
  header,
}: {
  tabs: MarketerTab[]
  active: string
  onSelect: (id: string) => void
  children: ReactNode
  header: ReactNode
}) {
  const { t } = useLanguage()

  return (
    <div className="container-app pt-6 sm:pt-10">
      {header}
      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 rounded-2xl border border-line bg-surface p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  active === tab.id ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-900/5'
                }`}
              >
                <tab.icon size={16} />
                {t(tab.labelKey)}
              </button>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <div className="mb-5 flex gap-1 overflow-x-auto pb-1 no-scrollbar lg:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active === tab.id ? 'bg-brand-600 text-white' : 'bg-surface text-ink-700 hover:bg-ink-900/5'
                }`}
              >
                <tab.icon size={16} />
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}