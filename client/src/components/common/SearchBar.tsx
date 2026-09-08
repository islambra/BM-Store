import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { listProducts } from '../../services/api'
import { toProduct } from '../../services/catalog'
import type { Product } from '../../types'
import { localizedName } from '../../utils/localize'
import { useLanguage } from '../../context/LanguageContext'
import { useCatalog } from '../../context/CatalogContext'
import { formatPrice } from './Price'

export default function SearchBar({
  autoFocus = false,
  onNavigate,
}: {
  autoFocus?: boolean
  onNavigate?: () => void
}) {
  const { t, lang } = useLanguage()
  const { localizeCategory } = useCatalog()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const suggestionsId = useRef(`sb-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      listProducts({ q, limit: 6, sort: 'best-selling' })
        .then((page) => setSuggestions(page.products.map(toProduct)))
        .catch(() => setSuggestions([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const submit = (value?: string) => {
    const q = (value ?? query).trim()
    if (!q) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(q)}`)
    onNavigate?.()
  }

  const clear = () => {
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={t('common.search')}
          aria-label={t('common.search')}
          aria-expanded={open}
          aria-controls={suggestionsId.current}
          className="input h-11 rounded-full border-line bg-canvas pe-11 ps-11 shadow-none placeholder:text-ink-400 focus:bg-surface"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label={t('common.clear')}
            className="absolute end-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-ink-900/5 text-ink-500 hover:bg-ink-900/10 hover:text-ink-900"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          id={suggestionsId.current}
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
        >
          <div className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-ink-400">
            {t('search.suggestions')}
          </div>
          <ul className="max-h-80 overflow-auto p-1.5">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/product/${p.id}`)
                    onNavigate?.()
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-start transition-colors hover:bg-canvas"
                >
                  <img src={p.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">
                      {localizedName(p, lang)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
                      <span>{localizeCategory(p.categoryName || p.category)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-brand-700">{formatPrice(p.price, lang)}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => submit()}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
              >
                <Search size={13} />
                {t('search.viewAll', { q: query.trim() })}
              </button>
            </li>
          </ul>
        </div>
      )}

      {open && query.trim() && suggestions.length === 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-500 shadow-lift">
          {t('common.noResults')}
        </div>
      )}
    </div>
  )
}