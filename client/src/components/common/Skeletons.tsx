/* Lightweight skeleton loaders for products, lists and rows. */

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-16 rounded-full" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-5 w-20 rounded" />
          <div className="skeleton h-4 w-10 rounded" />
        </div>
      </div>
    </div>
  )
}

export function TextSkeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function RowSkeleton({ withImage = true }: { withImage?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      {withImage && <div className="skeleton h-16 w-16 shrink-0 rounded-xl" />}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  )
}