import { Link } from 'react-router-dom'
import logo from '../../assets/logo.jpg'
import { useLanguage } from '../../context/LanguageContext'
import { useCatalog } from '../../context/CatalogContext'
import { localizedName } from '../../utils/localize'
import { languages } from '../../i18n/translations'

const catName = (c: { name: string; nameAr?: string; nameFr?: string }, lang: string) => localizedName(c, lang)

export default function Footer() {
  const { t, lang, setLang } = useLanguage() // prettier-ignore
  const { categories } = useCatalog()

  return (
    <footer className="mt-16 bg-ink-900 pb-28 text-white lg:pb-0">
      <div className="container-app py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-sm">
            <Link to="/" className="inline-block">
              <span className="inline-flex rounded-xl bg-surface p-2">
                <img src={logo} alt="BM Store" className="h-9 w-auto object-contain" />
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/70">{t('footer.description')}</p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link className="transition-colors hover:text-white" to="/categories">{t('nav.categories')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/special-offers">{t('nav.deals')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/best-sellers">{t('nav.bestSellers')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/wishlist">{t('common.wishlist')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/dashboard">{t('common.account')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/marketer">{t('marketer.become')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
              {t('footer.categories')}
            </h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link className="transition-colors hover:text-white" to={`/category/${c.slug}`}>
                    {catName(c, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
              {t('common.language')}
            </h3>
            <div className="flex flex-col gap-2.5">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`w-full rounded-xl px-4 py-2.5 text-start text-sm font-semibold transition-colors ${
                    l.code === lang
                      ? 'bg-brand-600 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} BM Store. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-4">
            <Link className="transition-colors hover:text-white" to="/privacy">{t('footer.privacy')}</Link>
            <Link className="transition-colors hover:text-white" to="/terms">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}