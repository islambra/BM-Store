import { LayoutGrid, LoaderCircle, AlertCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useCatalog } from '../context/CatalogContext'
import CategoryCard from '../components/product/CategoryCard'
import PageHeader from '../components/common/PageHeader'

export default function CategoriesPage() {
  const { t } = useLanguage()
  const { categories, loading, error, reload } = useCatalog()

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader icon={LayoutGrid} title={t('category.title')} subtitle={t('category.subtitle')} />

      {loading ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-16 text-ink-400">
          <LoaderCircle size={28} className="animate-spin" />
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      ) : error ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-16 text-center">
          <span className="inline-flex items-center gap-2 text-sm text-danger-600">
            <AlertCircle size={16} />
            {error}
          </span>
          <button type="button" className="btn-primary" onClick={reload}>
            {t('common.refresh')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      )}
    </div>
  )
}