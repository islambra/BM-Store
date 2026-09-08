import { useEffect, useRef, useState } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { languages } from '../../i18n/translations'
import { useLanguage } from '../../context/LanguageContext'

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = languages.find((l) => l.code === lang)!

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-900/5 focus-visible:outline-none focus-visible:shadow-focus"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
      >
        <Globe size={18} className="text-ink-500" />
        <span>{current.short}</span>
        <ChevronDown size={14} className="text-ink-400" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute end-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl bg-surface p-1.5 shadow-lift"
        >
          {languages.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  l.code === lang
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-ink-700 hover:bg-ink-900/5'
                }`}
              >
                <span>{l.label}</span>
                {l.code === lang && <Check size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}