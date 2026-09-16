import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { translate } from '../i18n/translations'
import type { Lang } from '../i18n/translations'
import { LANG_STORAGE_KEY, langFromStorage, langFromUrl } from '../utils/storeUrl'

interface LanguageContextValue {
  lang: Lang
  dir: 'ltr' | 'rtl'
  t: (key: string, vars?: Record<string, string | number>) => string
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => langFromUrl() ?? langFromStorage() ?? 'ar')

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem(LANG_STORAGE_KEY, lang)
    // Honour ?lang= on load, then keep the address bar free of it.
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang')
        const clean = url.href
        if (clean !== window.location.href) window.history.replaceState(window.history.state, '', clean)
      }
    } catch {
      /* non-browser environment */
    }
  }, [lang, dir])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
  }, [])

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