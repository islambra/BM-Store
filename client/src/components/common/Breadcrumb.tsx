import { Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export default function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  const { lang } = useLanguage()
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap text-xs text-ink-500">
      <Link to="/" className="font-medium hover:text-brand-700">
        {lang === 'ar' ? 'الرئيسية' : 'Home'}
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <Chevron size={14} className="text-ink-400" />
          {item.to ? (
            <Link to={item.to} className="font-medium hover:text-brand-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-ink-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}