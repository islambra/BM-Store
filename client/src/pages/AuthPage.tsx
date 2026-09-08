import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, ArrowLeft, ShieldCheck, Truck, BadgeCheck, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import logo from '../assets/logo.jpg'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'
import { Alert, Field, Input } from '../components/common/FormControls'

export type AuthMode = 'login' | 'register' | 'forgot'

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const location = useLocation()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/account'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'forgot') {
      setSubmitted(true)
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 6) {
      setError(t('auth.passwordShort'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        await register(name, email, password)
      } else {
        await login(email, password)
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const passwordToggler = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      aria-label={showPw ? t('auth.hidePassword') : t('auth.showPassword')}
      className="absolute end-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:text-ink-900"
    >
      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )

  return (
    <div className="container-app flex justify-center py-8 sm:py-14">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden bg-brand-700 p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -end-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 -start-10 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative">
            <span className="inline-flex rounded-2xl bg-surface p-2.5">
              <img src={logo} alt="BM Store" className="h-9 w-auto object-contain" />
            </span>
            <h2 className="mt-6 font-display text-2xl font-extrabold leading-snug">
              {t('brand.tagline')}
            </h2>
            <ul className="mt-8 space-y-4 text-sm text-white/90">
              <li className="flex items-center gap-3">
                <ShieldCheck size={18} className="shrink-0 text-white/70" /> {t('trust.secureDesc')}
              </li>
              <li className="flex items-center gap-3">
                <Truck size={18} className="shrink-0 text-white/70" /> {t('trust.deliveryDesc')}
              </li>
              <li className="flex items-center gap-3">
                <BadgeCheck size={18} className="shrink-0 text-white/70" /> {t('trust.qualityDesc')}
              </li>
            </ul>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-6 sm:p-10">
          <div className="lg:hidden">
            <span className="inline-flex rounded-2xl bg-brand-50 p-2">
              <img src={logo} alt="BM Store" className="h-7 w-auto object-contain" />
            </span>
          </div>

          {mode === 'forgot' && submitted ? (
            <div className="py-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Mail size={26} />
              </span>
              <h1 className="mt-4 text-xl font-bold text-ink-900">{t('auth.resetTitle')}</h1>
              <p className="mt-2 text-sm text-ink-500">{t('auth.resetDesc')}</p>
              <button type="button" className="btn-primary mt-6" onClick={() => navigate('/login')}>
                {t('auth.backToLogin')}
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
                {mode === 'register' ? t('auth.createAccount') : mode === 'forgot' ? t('auth.resetTitle') : t('auth.welcomeBack')}
              </h1>
              <p className="mt-1.5 text-sm text-ink-500">
                {mode === 'register' ? t('auth.haveAccount') : t('auth.demo')}
              </p>

              {error && (
                <Alert tone="danger" className="mt-5">
                  {error}
                </Alert>
              )}

              <form onSubmit={submit} className="mt-7 space-y-5">
                {mode === 'register' && (
                  <Field id="name" label={t('auth.fullName')} required>
                    <Input id="name" icon={User} required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </Field>
                )}
                <Field id="email" label={t('auth.email')} required>
                  <Input id="email" icon={Mail} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </Field>
                {mode !== 'forgot' && (
                  <Field id="password" label={t('auth.password')} required>
                    <Input
                      id="password"
                      icon={Lock}
                      type={showPw ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      className="pe-12"
                    />
                    {passwordToggler}
                  </Field>
                )}
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
                      className="pe-12"
                    />
                    {passwordToggler}
                  </Field>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <Link to="/forgot" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                      {t('auth.forgot')}
                    </Link>
                  </div>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full py-3.5 disabled:opacity-60">
                  {busy ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : mode === 'register' ? (
                    t('auth.createAccount')
                  ) : mode === 'forgot' ? (
                    t('auth.sendReset')
                  ) : (
                    t('auth.signIn')
                  )}
                  {!busy && <ArrowIcon size={17} />}
                </button>
              </form>

              <div className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-500">
                {mode === 'register' ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
                <Link
                  to={mode === 'register' ? '/login' : '/register'}
                  className="font-bold text-brand-700 hover:text-brand-800"
                >
                  {mode === 'register' ? t('auth.signIn') : t('auth.createAccount')}
                </Link>
              </div>

              {mode === 'forgot' && (
                <div className="mt-4 text-center">
                  <Link to="/login" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                    {t('auth.backToLogin')}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}