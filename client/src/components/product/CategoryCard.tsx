import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Flame, Leaf, Droplets, Sparkles, Cake, Nut, Bean, Apple } from 'lucide-react'
import type { Category } from '../../types'
import { useLanguage } from '../../context/LanguageContext'
import type { Lang } from '../../i18n/translations'

const iconMap = {
  spices: Flame,
  cosmetics: Sparkles,
  baking: Cake,
  nuts: Nut,
  legumes: Bean,
  natural: Leaf,
  dried: Apple,
  oilsHoney: Droplets,
}

const nameByLang = (c: Category, lang: Lang) => {
  if (lang === 'ar' && c.nameAr) return c.nameAr
  if (lang === 'fr' && c.nameFr) return c.nameFr
  return c.name
}

export default function CategoryCard({
  category,
  variant = 'default',
}: {
  category: Category
  variant?: 'default' | 'compact'
}) {
  const { lang, t } = useLanguage()
  const Icon = iconMap[category.icon] ?? Sparkles
  const isAr = lang === 'ar'
  const Arrow = isAr ? ArrowLeft : ArrowRight
  const name = nameByLang(category, lang)

  if (variant === 'compact') {
    return (
      <Link
        to={`/category/${category.slug}`}
        className="group flex min-w-[5.5rem] shrink-0 flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft sm:min-w-0"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-all duration-200 group-hover:bg-brand-600 group-hover:text-white group-active:scale-90 sm:h-16 sm:w-16">
          <Icon size={24} />
        </span>
        <span className="max-w-full truncate text-xs font-semibold text-ink-700 sm:text-sm">
          {name}
        </span>
      </Link>
    )
  }

  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={category.image}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-ink-900/10 to-transparent" />
        <span className="absolute bottom-3 start-3 flex h-9 w-9 items-center justify-center rounded-xl bg-surface/90 text-brand-600 backdrop-blur">
          <Icon size={18} />
        </span>
      </div>
      <div className="flex flex-1 items-center justify-between p-4">
        <div>
          <h3 className="font-display text-base font-bold text-ink-900">{name}</h3>
          <p className="mt-0.5 text-xs text-ink-500">
            {t('category.productCount', { count: category.productCount })}
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-all duration-300 group-hover:bg-brand-600 group-hover:text-white">
          <Arrow size={16} />
        </span>
      </div>
    </Link>
  )
}