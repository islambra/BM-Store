import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Phone, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, LoaderCircle, ShieldCheck, Truck, BadgeCheck } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { localizeError } from '../utils/errors'
import { getStoredReferral, getVisitorId } from '../services/referral'
import { Field, Input } from '../components/common/FormControls'
import AuthLayout from '../components/auth/AuthLayout'

export type AuthMode = 'login' | 'register'

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const location = useLocation()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

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
    <AuthLayout
      eyebrow={mode === 'register' ? t('auth.createAccount') : t('auth.signIn')}
      title={mode === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}
      subtitle={mode === 'register' ? t('auth.createSubtitle') : t('auth.demo')}
      brandHeadline={mode === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}
      brandSubtitle={mode === 'register' ? t('auth.createSubtitle') : t('auth.demo')}
      benefits={features}
      error={error}
      onDismissError={() => setError('')}
      switchBlock={
        <>
          {mode === 'register' ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
          <Link
            to={mode === 'register' ? '/login' : '/register'}
            className="font-bold text-brand-700 hover:text-brand-800"
          >
            {mode === 'register' ? t('auth.signIn') : t('auth.createAccount')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="mt-6 space-y-4">
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

        <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-60">
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
    </AuthLayout>
  )
}