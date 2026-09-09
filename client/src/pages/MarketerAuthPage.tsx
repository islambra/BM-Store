import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Lock, User, ArrowRight, ArrowLeft, Megaphone, Eye, EyeOff, LoaderCircle, CreditCard, Hash } from 'lucide-react'
import logo from '../assets/logo.jpg'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'
import { Alert, Field, Input } from '../components/common/FormControls'

export type MarketerAuthMode = 'signup' | 'login'

export default function MarketerAuthPage({ mode }: { mode: MarketerAuthMode }) {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const { login, registerMarketer } = useAuth()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [baridiMob, setBaridiMob] = useState('')
  const [ccp, setCcp] = useState('')
  const [ccpKey, setCcpKey] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isSignup = mode === 'signup'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isSignup) {
      if (password !== confirm) {
        setError(t('auth.passwordMismatch'))
        return
      }
      if (password.length < 8) {
        setError(t('auth.passwordMin'))
        return
      }
    }
    if (password.length < 6) {
      setError(t('auth.passwordShort'))
      return
    }
    setBusy(true)
    try {
      if (isSignup) {
        await registerMarketer({ name, phone, password, baridiMob: baridiMob.trim() || undefined, ccp: ccp.trim() || undefined, ccpKey: ccpKey.trim() || undefined })
      } else {
        await login(phone, password)
      }
      navigate('/marketer', { replace: true })
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
      className="absolute end-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-900 focus-visible:outline-none focus-visible:shadow-focus"
    >
      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )

  const benefits = [
    { icon: Megaphone, text: t('marketer.authEarn') },
    { icon: CreditCard, text: t('marketer.authPayout') },
    { icon: Hash, text: t('marketer.authUnique') },
  ]

  return (
    <div className="container-app flex items-center justify-center py-8 lg:py-12">
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
            <h2 className="mt-5 font-display text-[1.4rem] font-extrabold leading-tight tracking-tight">
              {t('marketer.title')}
            </h2>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/80">{t('marketer.authDesc')}</p>
          </div>

          <ul className="relative mt-4 space-y-2">
            {benefits.map((b) => (
              <li key={b.text} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <b.icon size={16} />
                </span>
                <p className="text-sm font-semibold text-white/95">{b.text}</p>
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
            {isSignup ? t('marketer.signupTitle') : t('marketer.loginTitle')}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {isSignup ? t('marketer.signupDesc') : t('marketer.loginDesc')}
          </p>

          {error && (
            <Alert tone="danger" className="mt-4">
              {error}
            </Alert>
          )}

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {isSignup && (
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
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                trailing={passwordToggler}
              />
            </Field>
            {isSignup && (
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

            {isSignup && (
              <div className="rounded-2xl border border-line bg-canvas p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{t('marketer.payoutDetails')}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{t('marketer.payoutDetailsSub')}</p>
                <div className="mt-3 space-y-3">
                  <Field label={t('marketer.baridiMob')}>
                    <Input dir="ltr" inputMode="numeric" value={baridiMob} onChange={(e) => setBaridiMob(e.target.value)} placeholder="06xxxxxxxx" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('marketer.ccp')}>
                      <Input dir="ltr" inputMode="numeric" value={ccp} onChange={(e) => setCcp(e.target.value)} placeholder="00123456789" />
                    </Field>
                    <Field label={t('marketer.ccpKey')}>
                      <Input dir="ltr" inputMode="numeric" value={ccpKey} onChange={(e) => setCcpKey(e.target.value)} placeholder="••••••" />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 disabled:opacity-60">
              {busy ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : isSignup ? (
                t('marketer.signupCta')
              ) : (
                t('auth.signIn')
              )}
              {!busy && <ArrowIcon size={17} />}
            </button>
          </form>

          <div className="mt-5 border-t border-line pt-4 text-center text-sm text-ink-500">
            {isSignup ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
            <Link
              to={isSignup ? '/marketer/login' : '/marketer/signup'}
              className="font-bold text-brand-700 hover:text-brand-800"
            >
              {isSignup ? t('auth.signIn') : t('marketer.signupCta')}
            </Link>
          </div>

          <div className="mt-3 text-center">
            <Link to="/" className="text-sm font-semibold text-ink-500 hover:text-ink-700">
              ← {t('marketer.backToStore')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}