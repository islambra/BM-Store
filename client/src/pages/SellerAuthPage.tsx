import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Store, Package, Search, Eye, EyeOff, ArrowRight, ArrowLeft, LoaderCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage, registerSeller, loginSeller } from '../services/api'
import { Label, Input } from '../components/common/FormControls'
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
          <>
            <div>
              <Label htmlFor="fullName">{t('seller.fullName')}</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder={t('auth.fullName')}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="email">{t('seller.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('auth.email')}
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="phone">{t(isRegister ? 'seller.phone' : 'seller.phoneOrEmail')}</Label>
          <Input
            id="phone"
            name="phone"
            type="text"
            inputMode={isRegister ? 'tel' : undefined}
            value={formData.phone}
            onChange={handleChange}
            placeholder={isRegister ? t('auth.phone') : t('seller.phoneOrEmailPlaceholder')}
            required
            disabled={loading}
          />
        </div>

        <div>
          <Label htmlFor="password">{t('seller.password')}</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder={t('auth.password')}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-900"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {isRegister && (
          <div>
            <Label htmlFor="confirmPassword">{t('seller.confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('auth.confirmPassword')}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-900"
                aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        <button type="submit" className="btn-dark w-full py-3" disabled={loading}>
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