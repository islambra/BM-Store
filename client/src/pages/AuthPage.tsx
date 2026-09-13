import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Phone, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, LoaderCircle, ShieldCheck, Truck, BadgeCheck, X } from 'lucide-react'
import logo from '../assets/logo.jpg'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { localizeError } from '../utils/errors'
import { getStoredReferral, getVisitorId } from '../services/referral'
import { Field, Input } from '../components/common/FormControls'

export type AuthMode = 'login' | 'register'

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const location = useLocation()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [error])

  const features = [
    { icon: ShieldCheck, title: t('trust.secure') },
    { icon: Truck, title: t('trust.delivery') },
    { icon: BadgeCheck, title: t('trust.quality') },
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'register' && password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.passwordShort'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(name, phone, password, { referralId: getStoredReferral()?.id, visitorId: getVisitorId() })
      } else {
        await login(phone, password)
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(localizeError(err, t))
    } finally {
      setBusy(false)
    }
  }

  const passwordToggler = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      aria-label={showPw ? t('auth.hidePassword') : t('auth.showPassword')}
      className="absolute end-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-900 focus-visible:outline-none focus-visible:shadow-focus"
    >
      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )

  return (
    <div className="container-app flex flex-col items-center justify-center py-8 lg:py-12">
      {error && (
        <div
          role="alert"
          className="mb-4 flex w-full max-w-3xl items-start justify-between gap-3 rounded-2xl border border-danger-100 bg-danger-50 p-4 text-sm font-medium text-danger-700"
        >
          <span className="mt-0.5">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            aria-label={t('common.close')}
            className="shrink-0 rounded-lg p-1 text-danger-500 transition-colors hover:bg-danger-100"
          >
            <X size={15} />
          </button>
        </div>
      )}
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-ink-600 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700">
        <BackIcon size={14} />
        {t('common.backToStore')}
      </Link>
      <div className="grid w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-line bg-surface shadow-lift lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-7 text-white lg:flex">
          <div className="pointer-events-none absolute -end-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -start-12 h-60 w-60 rounded-full bg-brand-400/25 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-4 start-6 select-none font-display text-[6rem] font-extrabold leading-none tracking-tight text-white/[0.06]">
            BM
          </span>

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 p-2 pe-3.5 backdrop-blur">
              <img src={logo} alt="BM Store" className="h-8 w-auto object-contain" />
              <span className="font-display text-sm font-extrabold tracking-tight">{t('brand.storeName')}</span>
            </span>
            <h2 className="mt-6 font-display text-[1.4rem] font-extrabold leading-tight tracking-tight">
              {mode === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}
            </h2>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/80">
              {mode === 'register' ? t('auth.createSubtitle') : t('auth.demo')}
            </p>
          </div>

          <ul className="relative mt-7 space-y-2">
            {features.map((f) => (
              <li key={f.title} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <f.icon size={16} />
                </span>
                <p className="text-sm font-semibold text-white/95">{f.title}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-2xl bg-brand-50 p-2 lg:hidden">
            <img src={logo} alt="BM Store" className="h-6 w-auto object-contain" />
            <span className="pe-1 font-display text-sm font-extrabold text-brand-800">{t('brand.storeName')}</span>
          </span>

          <p className="eyebrow">{t('brand.storeName')}</p>
          <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
            {mode === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {mode === 'register' ? t('auth.createSubtitle') : t('auth.demo')}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === 'register' && (
              <Field id="name" label={t('auth.fullName')} required>
                <Input id="name" icon={User} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
            )}
            <Field id="phone" label={t('auth.phone')} required>
              <Input id="phone" icon={Phone} type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="07xxxxxxxx" />
            </Field>
            <Field id="password" label={t('auth.password')} required>
              <Input
                id="password"
                icon={Lock}
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                trailing={passwordToggler}
              />
            </Field>
            {mode === 'register' && (
              <Field id="confirm" label={t('auth.confirmPassword')} required>
                <Input
                  id="confirm"
                  icon={Lock}
                  type={showPw ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  trailing={passwordToggler}
                />
              </Field>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 disabled:opacity-60">
              {busy ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : mode === 'register' ? (
                t('auth.createAccount')
              ) : (
                t('auth.signIn')
              )}
              {!busy && <ArrowIcon size={17} />}
            </button>
          </form>

          <div className="mt-5 border-t border-line pt-4 text-center text-sm text-ink-500">
            {mode === 'register' ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
            <Link
              to={mode === 'register' ? '/login' : '/register'}
              className="font-bold text-brand-700 hover:text-brand-800"
            >
              {mode === 'register' ? t('auth.signIn') : t('auth.createAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}