import { Link } from 'react-router-dom'
import { AtSign, Play, Share2, type LucideIcon } from 'lucide-react'
import logo from '../../assets/logo.jpg'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useCatalog } from '../../context/CatalogContext'
import { localizedName } from '../../utils/localize'
import { getAccountRoute } from '../../utils/account'

const catName = (c: { name: string; nameAr?: string; nameFr?: string }, lang: string) => localizedName(c, lang)

const socials: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Share2, label: 'Facebook', href: 'https://www.facebook.com' },
  { icon: AtSign, label: 'Instagram', href: 'https://www.instagram.com' },
  { icon: Play, label: 'YouTube', href: 'https://www.youtube.com' },
]

export default function Footer() {
  const { t, lang } = useLanguage()
  const { categories } = useCatalog()
  const { user } = useAuth()

  const supportLinks = [
    { to: '/help', label: t('footer.faq') },
    { to: '/contact', label: t('footer.contact') },
    { to: '/about', label: t('footer.about') },
    { to: '/privacy', label: t('footer.privacy') },
    { to: '/terms', label: t('footer.terms') },
  ]

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
            <div className="mt-5 flex items-center gap-3">
              <span className="text-sm font-semibold text-white/80">{t('footer.follow')}</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/80 transition-colors hover:bg-brand-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <s.icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link className="transition-colors hover:text-white" to="/categories">{t('nav.categories')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/stores">{t('nav.stores')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/special-offers">{t('nav.deals')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/best-sellers">{t('nav.bestSellers')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/wishlist">{t('common.wishlist')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to={getAccountRoute(user?.role)}>{t('common.account')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/marketer">{t('marketer.become')}</Link></li>
              <li><Link className="transition-colors hover:text-white" to="/seller/register">{t('seller.storeRequest')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
              {t('footer.categories')}
            </h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link className="transition-colors hover:text-white" to={`/category/${c.slug}`}>
                    {catName(c, lang)}
                  </Link>
                </li>
              ))}
            </ul>
            {categories.length > 6 && (
              <Link
                to="/categories"
                className="mt-3 inline-block text-sm font-semibold text-brand-400 transition-colors hover:text-brand-300"
              >
                {t('nav.categories')} →
              </Link>
            )}
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/90">
              {t('footer.support')}
            </h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              {supportLinks.map((l) => (
                <li key={l.to}>
                  <Link className="transition-colors hover:text-white" to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} BM Store. {t('footer.rights')}
          </p>
          <Link to="/" className="font-semibold text-white/60 transition-colors hover:text-white">
            BM Store
          </Link>
        </div>
      </div>
    </footer>
  )
}