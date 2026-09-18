import type { LucideIcon } from 'lucide-react'
import { Edit, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Lang } from '../../i18n/translations'
import { formatPrice } from '../common/Price'

/* ------------------------------------------------------------------ */
/* Shared building blocks for the seller dashboard catalog views.      */
/* Products, categories and orders all use the same "catalog row"      */
/* language: a media tile, a text block, and a right rail of meta      */
/* chips + actions. Financial figures always render in tabular-nums.  */
/* ------------------------------------------------------------------ */

/** Bordered, divided shell that holds a list of catalog rows. */
export function CatalogList({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-line bg-surface">{children}</div>
}

/** A single ledger row. */
export function CatalogRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-ink-900/[0.03] sm:px-5">
      {children}
    </div>
  )
}

type MediaSize = 'sm' | 'md' | 'lg'

const mediaBox: Record<MediaSize, string> = {
  sm: 'h-9 w-9 rounded-lg',
  md: 'h-12 w-12 rounded-xl',
  lg: 'h-16 w-16 rounded-xl',
}

/** Square media tile — image when present, otherwise a tinted icon tile. */
export function MediaTile({
  src,
  alt,
  icon: Icon,
  size = 'md',
}: {
  src?: string
  alt?: string
  icon: LucideIcon
  size?: MediaSize
}) {
  const box = mediaBox[size]
  if (src) {
    return <img src={src} alt={alt ?? ''} loading="lazy" className={`${box} shrink-0 border border-line bg-canvas object-cover`} />
  }
  return (
    <span className={`${box} flex shrink-0 items-center justify-center bg-brand-50 text-brand-600`}>
      <Icon size={size === 'lg' ? 26 : size === 'md' ? 20 : 16} />
    </span>
  )
}

/** Primary line + secondary meta lines. `flex-1 basis-52` collapses cleanly on small screens. */
export function ItemText({ title, secondary }: { title: ReactNode; secondary?: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 basis-52">
      <p className="truncate font-semibold text-ink-900">{title}</p>
      {secondary && <div className="mt-0.5 text-sm text-ink-500">{secondary}</div>}
    </div>
  )
}

/** Compact price with an optional struck-through old price (special offers). */
export function PriceRail({ price, oldPrice, lang }: { price: number; oldPrice?: number; lang: Lang }) {
  return (
    <div className="text-end">
      <p className="whitespace-nowrap text-sm font-extrabold tabular-nums text-ink-900">{formatPrice(price, lang)}</p>
      {Number(oldPrice) > 0 && (
        <p className="whitespace-nowrap text-xs tabular-nums text-ink-400 line-through">{formatPrice(Number(oldPrice), lang)}</p>
      )}
    </div>
  )
}

/** Small mono chip for references and counts. */
export function TicketChip({ children, dir = 'ltr' }: { children: ReactNode; dir?: 'ltr' | 'rtl' }) {
  return (
    <span
      dir={dir}
      className="inline-flex items-center rounded-lg border border-line bg-canvas px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums tracking-tight text-ink-700"
    >
      {children}
    </span>
  )
}

/** Edit + delete icon buttons, docked at the end of a row. */
export function RowActions({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  onEdit: () => void
  onDelete: () => void
  editLabel: string
  deleteLabel: string
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onEdit} aria-label={editLabel} className="icon-btn text-ink-400 hover:text-brand-600">
        <Edit size={16} />
      </button>
      <button type="button" onClick={onDelete} aria-label={deleteLabel} className="icon-btn text-ink-400 hover:text-danger-600">
        <Trash2 size={16} />
      </button>
    </div>
  )
}