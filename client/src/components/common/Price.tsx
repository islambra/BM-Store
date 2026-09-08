import { useLanguage } from '../../context/LanguageContext'
import type { Lang } from '../../i18n/translations'

export function formatPrice(value: number, lang: string) {
  const activeLang = lang as Lang
  const integer = Math.round(value)
  const grouped = new Intl.NumberFormat('en-US').format(integer)
  if (activeLang === 'ar') return `${grouped.replace(/,/g, '\u202F')} دج`
  if (activeLang === 'fr') return `${grouped.replace(/,/g, '\u202F')} DA`
  return `${grouped} DA`
}

export default function Price({
  value,
  compareAt,
  size = 'md',
  className = '',
}: {
  value: number
  compareAt?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const { lang } = useLanguage()
  const dims = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className={`${dims} font-bold tracking-tight text-ink-900`}>{formatPrice(value, lang)}</span>
      {compareAt !== undefined && compareAt > value && (
        <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-ink-400 line-through`}>
          {formatPrice(compareAt, lang)}
        </span>
      )}
    </div>
  )
}