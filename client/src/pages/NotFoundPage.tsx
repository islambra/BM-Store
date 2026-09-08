import { Link } from 'react-router-dom'
import { Home, FileQuestion } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function NotFoundPage() {
  const { t } = useLanguage()

  return (
    <div className="container-app flex justify-center pt-10 sm:pt-16">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-brand-600">
          <FileQuestion size={38} />
        </span>
        <p className="mt-6 text-6xl font-extrabold tracking-tight text-ink-900/10">404</p>
        <h1 className="-mt-5 text-xl font-extrabold text-ink-900 sm:text-2xl">{t('notFound.title')}</h1>
        <p className="mt-2 text-sm text-ink-500">{t('notFound.desc')}</p>
        <Link to="/" className="btn-primary mt-7">
          <Home size={17} />
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  )
}