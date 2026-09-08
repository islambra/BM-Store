import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Category } from '../types'
import { useLanguage } from './LanguageContext'
import { loadCategories } from '../services/catalog'
import { localizedName } from '../utils/localize'

interface CatalogContextValue {
  categories: Category[]
  loading: boolean
  error: string
  reload: () => void
  categoryBySlug: (slug: string) => Category | undefined
  localizeCategory: (nameOrSlug: string) => string
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    loadCategories()
      .then((list) => {
        if (alive) {
          setCategories(list)
          setError('')
        }
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Failed to load categories')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const categoryBySlug = useCallback((slug: string) => categories.find((c) => c.slug === slug), [categories])

  const localizeCategory = useCallback(
    (nameOrSlug: string) => {
      if (!nameOrSlug) return nameOrSlug
      const match =
        categories.find((c) => c.slug === nameOrSlug) ?? categories.find((c) => c.name.toLowerCase() === nameOrSlug.toLowerCase())
      return match ? localizedName(match, lang) : nameOrSlug
    },
    [categories, lang]
  )

  const reload = useCallback(() => {
    setLoading(true)
    loadCategories()
      .then((list) => {
        setCategories(list)
        setError('')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load categories'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <CatalogContext.Provider value={{ categories, loading, error, reload, categoryBySlug, localizeCategory }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}