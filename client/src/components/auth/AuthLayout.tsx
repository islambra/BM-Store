import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, X, type LucideIcon } from 'lucide-react'
import logo from '../../assets/logo.jpg'
import { useLanguage } from '../../context/LanguageContext'

interface Benefit {
  icon: LucideIcon
  title: string
}

interface AuthLayoutProps {
  eyebrow: string
  title: string
  subtitle?: string
  brandHeadline: string
  brandSubtitle: string
  benefits: Benefit[]
  error?: string
  onDismissError?: () => void
  switchBlock: React.ReactNode
  children: React.ReactNode
}

const SWATCHES = [
  'bg-gradient-to-br from-amber-300 to-amber-600',
  'bg-gradient-to-br from-orange-400 to-accent-600',
  'bg-gradient-to-br from-lime-300 to-lime-600',
  'bg-gradient-to-br from-yellow-400 to-yellow-700',
]

export default function AuthLayout({
  eyebrow,
  title,
  subtitle,
  brandHeadline,
  brandSubtitle,
  benefits,
  error,
  onDismissError,
  switchBlock,
  children,
}: AuthLayoutProps) {
  const { t, lang } = useLanguage()
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft

  useEffect(() => {
    if (error) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error])

  return (
    <div className="container-app flex flex-col items-center justify-center py-8 lg:py-12">
      {error && (
        <div
          role="alert"
          className="mb-4 flex w-full max-w-3xl animate-slide-up items-start justify-between gap-3 rounded-2xl border border-danger-100 bg-danger-50 p-4 text-sm font-medium text-danger-700"
        >
          <span className="mt-0.5">{error}</span>
          <button
            type="button"
            onClick={onDismissError}
            aria-label={t('common.close')}
            className="shrink-0 rounded-lg p-1 text-danger-500 transition-colors hover:bg-danger-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-ink-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
      >
        <BackIcon size={14} />
        {t('common.backToStore')}
      </Link>

      <div className="grid w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-lift lg:grid-cols-[1.12fr_1fr]">
        {/* Brand panel (desktop) */}
        <div className="relative hidden flex-col overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-7 text-white lg:flex">
          <div className="pointer-events-none absolute -end-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -start-12 h-60 w-60 rounded-full bg-brand-400/25 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-5 start-5 select-none font-display text-[6.5rem] font-extrabold leading-none tracking-tighter text-white/[0.05]">
            BM
          </span>

          {/* Rotating quality seal */}
          <div className="pointer-events-none absolute -end-16 top-1/2 h-52 w-52 -translate-y-1/2 opacity-[0.08]">
            <div className="animate-rotate-slow h-full w-full">
              <svg viewBox="0 0 200 200" className="h-full w-full text-white">
                <defs>
                  <path id="seal-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" fill="none" />
                </defs>
                <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <text className="fill-white text-[13px] font-bold uppercase tracking-[0.28em]">
                  <textPath href="#seal-circle">BM Store · Natural · Premium · </textPath>
                </text>
              </svg>
            </div>
          </div>

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 p-2 pe-3.5 backdrop-blur">
              <img src={logo} alt="BM Store" className="h-8 w-auto object-contain" />
              <span className="font-display text-sm font-extrabold tracking-tight">{t('brand.storeName')}</span>
            </span>
            <h2 className="mt-7 font-display text-[1.55rem] font-extrabold leading-[1.1] tracking-tight text-balance">
              {brandHeadline}
            </h2>
            <p className="mt-2.5 max-w-xs text-xs leading-relaxed text-white/80">{brandSubtitle}</p>
          </div>

          <ul className="relative mt-8 space-y-2">
            {benefits.map((b) => (
              <li key={b.title} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <b.icon size={16} />
                </span>
                <p className="text-sm font-semibold text-white/95">{b.title}</p>
              </li>
            ))}
          </ul>

          {/* Ingredient swatches — echo the natural catalogue */}
          <div className="relative mt-auto flex items-center gap-2 pt-6">
            {SWATCHES.map((g) => (
              <span key={g} className={`h-1.5 w-11 rounded-full ${g}`} />
            ))}
            <span className="ms-2 h-px flex-1 bg-white/20" />
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-2xl bg-brand-50 p-2 lg:hidden">
            <img src={logo} alt="BM Store" className="h-6 w-auto object-contain" />
            <span className="pe-1 font-display text-sm font-extrabold text-brand-800">{t('brand.storeName')}</span>
          </span>

          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</p>}

          {children}

          <div className="mt-6 border-t border-line pt-4 text-center text-sm text-ink-500">{switchBlock}</div>
        </div>
      </div>
    </div>
  )
}