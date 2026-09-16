import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, Lock, User, ArrowRight, ArrowLeft, Megaphone, Eye, EyeOff, LoaderCircle, CreditCard, Hash } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { localizeError } from '../utils/errors'
import { Field, Input } from '../components/common/FormControls'
import AuthLayout from '../components/auth/AuthLayout'

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

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [error])

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
    setBusy(true)
    try {
      if (isSignup) {
        await registerMarketer({ name, phone, password, baridiMob: baridiMob.trim() || undefined, ccp: ccp.trim() || undefined, ccpKey: ccpKey.trim() || undefined })
      } else {
        await login(phone, password)
      }
      navigate('/marketer', { replace: true })
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

  const benefits = [
    { icon: Megaphone, title: t('marketer.authEarn') },
    { icon: CreditCard, title: t('marketer.authPayout') },
    { icon: Hash, title: t('marketer.authUnique') },
  ]

  return (
    <AuthLayout
      eyebrow={t('marketer.title')}
      title={isSignup ? t('marketer.signupTitle') : t('marketer.loginTitle')}
      subtitle={isSignup ? t('marketer.signupDesc') : t('marketer.loginDesc')}
      brandHeadline={isSignup ? t('marketer.signupTitle') : t('marketer.title')}
      brandSubtitle={t('marketer.authDesc')}
      benefits={benefits}
      error={error}
      onDismissError={() => setError('')}
      switchBlock={
        <>
          {isSignup ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
          <Link
            to={isSignup ? '/marketer/login' : '/marketer/signup'}
            className="font-bold text-brand-700 hover:text-brand-800"
          >
            {isSignup ? t('auth.signIn') : t('marketer.signupCta')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="mt-6 space-y-4">
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

        <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-60">
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
    </AuthLayout>
  )
}