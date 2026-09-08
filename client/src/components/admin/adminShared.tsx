import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { Alert } from '../common/FormControls'

export function Panel({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[680px] text-start">
        <thead className="border-b border-line text-start text-xs font-bold uppercase tracking-wide text-ink-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-start">
                {h}
              </th>
            ))}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-sm">{children}</tbody>
      </table>
    </div>
  )
}

export function Loader() {
  const { t } = useLanguage()
  return (
    <p className="flex items-center gap-2 py-8 text-sm text-ink-500">
      <LoaderCircle size={18} className="animate-spin" />
      {t('common.loading')}
    </p>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return <Alert tone="danger">{message}</Alert>
}

export function Badge({ children, tone }: { children: ReactNode; tone: 'ok' | 'warn' | 'muted' }) {
  const cls =
    tone === 'ok'
      ? 'bg-success-50 text-success-700'
      : tone === 'warn'
        ? 'bg-warning-50 text-warning-700'
        : 'bg-ink-900/5 text-ink-500'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>
}