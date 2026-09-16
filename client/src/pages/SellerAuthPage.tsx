import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Store, Package, Search, Lock, Mail, Phone, User, Eye, EyeOff, ArrowRight, ArrowLeft, LoaderCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage, registerSeller, loginSeller } from '../services/api'
import { Field, Input } from '../components/common/FormControls'
import AuthLayout from '../components/auth/AuthLayout'

type Mode = 'login' | 'register'

export default function SellerAuthPage({ mode }: { mode: Mode }) {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') || '/seller'
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'register') {
        if (!formData.fullName?.trim() || !formData.email?.trim() || !formData.phone?.trim() || !formData.password || !formData.confirmPassword) {
          setError(t('auth.errRequiredFields'))
          return
        }
        if (formData.password !== formData.confirmPassword) {
          setError(t('auth.passwordMismatch'))
          return
        }
        if (formData.password.length < 8) {
          setError(t('auth.passwordMin'))
          return
        }
        await registerSeller({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        })
        await refresh()
        navigate('/seller', { replace: true })
      } else {
        if (!formData.phone?.trim() || !formData.password) {
          setError(t('auth.errRequiredFields'))
          return
        }
        await loginSeller(formData.phone.trim(), formData.password)
        await refresh()
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === 'register'
  const benefits = [
    { icon: Store, title: t('seller.benefit1') },
    { icon: Package, title: t('seller.benefit3') },
    { icon: Search, title: t('seller.benefit11') },
  ]

  const pwToggler = (visible: boolean, onToggle: () => void) => (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
      className="absolute end-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-900 focus-visible:outline-none focus-visible:shadow-focus"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )

  return (
    <AuthLayout
      eyebrow={t('brand.storeName')}
      title={isRegister ? t('seller.registerTitle') : t('seller.loginTitle')}
      subtitle={isRegister ? t('seller.registerSubtitle') : t('seller.loginSubtitle')}
      brandHeadline={isRegister ? t('seller.storeRequest') : t('seller.loginTitle')}
      brandSubtitle={t('seller.registerSubtitle')}
      benefits={benefits}
      error={error}
      onDismissError={() => setError('')}
      switchBlock={
        <>
          {isRegister ? t('seller.alreadyHaveAccount') : t('auth.noAccount')}{' '}
          <Link
            to={isRegister ? '/seller/login' : '/seller/register'}
            className="font-bold text-brand-700 hover:text-brand-800"
          >
            {isRegister ? t('seller.signIn') : t('seller.registerCta')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isRegister && (
          <Field id="fullName" label={t('seller.fullName')} required>
            <Input
              id="fullName"
              icon={User}
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder={t('auth.fullName')}
              required
              disabled={loading}
            />
          </Field>
        )}

        {isRegister && (
          <Field id="email" label={t('seller.email')} required>
            <Input
              id="email"
              icon={Mail}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('auth.email')}
              required
              disabled={loading}
            />
          </Field>
        )}

        <Field id="phone" label={t(isRegister ? 'seller.phone' : 'seller.phoneOrEmail')} required>
          <Input
            id="phone"
            icon={Phone}
            name="phone"
            type="text"
            inputMode={isRegister ? 'tel' : undefined}
            value={formData.phone}
            onChange={handleChange}
            placeholder={isRegister ? t('auth.phone') : t('seller.phoneOrEmailPlaceholder')}
            required
            disabled={loading}
          />
        </Field>

        <Field id="password" label={t('seller.password')} required>
          <Input
            id="password"
            icon={Lock}
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder={t('auth.password')}
            required
            disabled={loading}
            trailing={pwToggler(showPassword, () => setShowPassword(!showPassword))}
          />
        </Field>

        {isRegister && (
          <Field id="confirmPassword" label={t('seller.confirmPassword')} required>
            <Input
              id="confirmPassword"
              icon={Lock}
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder={t('auth.confirmPassword')}
              required
              disabled={loading}
              trailing={pwToggler(showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword))}
            />
          </Field>
        )}

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : isRegister ? (
            t('seller.registerCta')
          ) : (
            t('auth.signIn')
          )}
          {!loading && <ArrowIcon size={17} />}
        </button>
      </form>
    </AuthLayout>
  )
}