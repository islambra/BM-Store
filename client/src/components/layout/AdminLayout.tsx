import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Store } from 'lucide-react'
import Logo from '../common/Logo'
import LanguageSwitcher from '../common/LanguageSwitcher'
import { useLanguage } from '../../context/LanguageContext'
import ReferralTracker from '../referral/ReferralTracker'

export default function AdminLayout() {
  const { t, lang } = useLanguage()
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <ReferralTracker />
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
            >
              <Store size={15} />
              {t('common.backToStore')}
            </Link>
            <LanguageSwitcher />
            <Link to="/" aria-label={t('common.backToStore')} className="icon-btn sm:hidden" title={t('common.backToStore')}>
              <BackIcon size={18} />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}