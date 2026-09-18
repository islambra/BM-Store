import { SlidersHorizontal, RotateCcw, ChevronDown } from 'lucide-react'
import type { Category } from '../../types'
import { useLanguage } from '../../context/LanguageContext'
import { useCatalog } from '../../context/CatalogContext'
import { localizedName } from '../../utils/localize'

export interface ProductFilters {
  category: string
  sort: 'featured' | 'priceAsc' | 'priceDesc' | 'popular' | 'best-selling' | 'newest'
  minPrice: number
  maxPrice: number
}

export const defaultFilters: ProductFilters = {
  category: '',
  sort: 'featured',
  minPrice: 0,
  maxPrice: 5000,
}

const catName = (c: { name: string; nameAr?: string; nameFr?: string }, lang: string) =>
  localizedName(c, lang)

export function SortSelect({
  value,
  onChange,
}: {
  value: ProductFilters['sort']
  onChange: (v: ProductFilters['sort']) => void
}) {
  const { t } = useLanguage()
  const options: { value: ProductFilters['sort']; label: string }[] = [
    { value: 'featured', label: t('sort.featured') },
    { value: 'popular', label: t('sort.popular') },
    { value: 'best-selling', label: t('sort.bestSelling') },
    { value: 'newest', label: t('sort.newest') },
    { value: 'priceAsc', label: t('sort.priceAsc') },
    { value: 'priceDesc', label: t('sort.priceDesc') },
  ]
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductFilters['sort'])}
        aria-label={t('filter.sortBy')}
        className="appearance-none rounded-xl border border-line bg-surface py-2.5 pe-9 ps-3.5 text-sm font-semibold text-ink-700 focus:border-brand-500 focus:outline-none focus:shadow-focus"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  )
}

export default function FilterPanel({
  filters,
  onChange,
  onReset,
  categories,
}: {
  filters: ProductFilters
  onChange: (patch: Partial<ProductFilters>) => void
  onReset: () => void
  categories?: Category[]
}) {
  const { t, lang } = useLanguage()
  const { categories: allCategories } = useCatalog()
  const list = categories ?? allCategories

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
          <SlidersHorizontal size={16} className="text-brand-600" />
          {t('common.filter')}
        </h3>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-ink-900">
          <RotateCcw size={13} />
          {t('filter.reset')}
        </button>
      </div>

      <div>
        <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500">{t('filter.category')}</h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onChange({ category: '' })}
            className={`block w-full rounded-lg px-3 py-2 text-start text-sm transition-colors ${
              filters.category === '' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-700 hover:bg-ink-900/5'
            }`}
          >
            {t('filter.all')}
          </button>
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ category: c.slug })}
              className={`block w-full rounded-lg px-3 py-2 text-start text-sm transition-colors ${
                filters.category === c.slug ? 'bg-brand-50 font-semibold text-brand-700' : 'text-ink-700 hover:bg-ink-900/5'
              }`}
            >
              {catName(c, lang)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-500">{t('filter.price')}</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(e) => onChange({ minPrice: Number(e.target.value) || 0 })}
            className="input py-2"
            aria-label={t('filter.priceMin')}
          />
          <span className="text-ink-400">-</span>
          <input
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: Number(e.target.value) || 0 })}
            className="input py-2"
            aria-label={t('filter.priceMax')}
          />
        </div>
      </div>
    </div>
  )
}