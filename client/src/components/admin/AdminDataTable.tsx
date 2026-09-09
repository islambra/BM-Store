import type { ReactNode } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
}

interface AdminDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  loading?: boolean
  emptyMessage?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
  pagination?: {
    page: number
    pages: number
    onPageChange: (page: number) => void
  }
  rowClassName?: (item: T) => string
}

export default function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage,
  sortBy,
  sortOrder,
  onSort,
  pagination,
  rowClassName,
}: AdminDataTableProps<T>) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="rounded-2xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="border-b border-line text-start text-xs font-bold uppercase tracking-wide text-ink-400">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 ${col.headerClassName || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="hover:bg-canvas animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                      <div className="h-4 w-3/4 bg-ink-900/5 rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-12 text-center">
        <p className="text-ink-500">{emptyMessage || t('admin.empty')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-start">
          <thead className="border-b border-line text-start text-xs font-bold uppercase tracking-wide text-ink-400">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 cursor-pointer select-none ${col.sortable ? 'hover:bg-ink-900/5' : ''} ${col.headerClassName || ''}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortBy === col.key && (
                      <span className="flex items-center">
                        {sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className={`hover:bg-canvas ${rowClassName?.(item) || ''}`}>
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <p className="text-sm text-ink-500">
            {t('admin.showing')} {pagination.page} {t('admin.of')} {pagination.pages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary text-sm px-3"
            >
              {t('admin.previous')}
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-secondary text-sm px-3"
            >
              {t('admin.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}