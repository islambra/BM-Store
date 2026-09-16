import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { translate } from '../i18n/translations'
import type { Lang } from '../i18n/translations'

interface LanguageContextValue {
  lang: Lang
  dir: 'ltr' | 'rtl'
  t: (key: string, vars?: Record<string, string | number>) => string
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'bm-store-lang'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' || saved === 'ar' ? saved : 'ar'
  })

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang, dir])

  const setLang = useCallback((next: Lang) => setLangState(next), [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const result = translate(lang, key, vars)
      return typeof result === 'string' ? result : ''
    },
    [lang]
  )

  return (
    <LanguageContext.Provider value={{ lang, dir, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}