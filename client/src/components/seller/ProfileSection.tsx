import { useEffect, useState } from 'react'
import { User, Lock, Save, AlertCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { getSellerMe, updateSellerMe, changeSellerPassword } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'
import { Input, Label, Button } from '../../components/common/FormControls'

export default function SellerProfileSection() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })

  useEffect(() => {
    let alive = true
    setLoading(true)

    getSellerMe()
      .then((res) => {
        if (alive && res.seller) {
          setFormData({
            fullName: res.seller.fullName,
            email: res.seller.email,
            phone: res.seller.phone,
          })
        }
      })
      .catch((err) => {
        if (alive) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => { alive = false }
  }, [])

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await updateSellerMe(formData)
      setSuccess(t('seller.profile.saved'))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError(t('seller.profile.passwordsMismatch'))
      return
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError(t('seller.profile.passwordTooShort'))
      return
    }

    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')

    try {
      await changeSellerPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setPasswordSuccess(t('seller.profile.passwordChanged'))
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
    } catch (err) {
      setPasswordError(getErrorMessage(err))
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.profile.title')} subtitle={t('seller.profile.subtitle')} />
        <div className="animate-pulse space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5 h-64" />
          <div className="rounded-2xl border border-line bg-surface p-5 h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader title={t('seller.profile.title')} subtitle={t('seller.profile.subtitle')} />

      {/* Personal Information */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
          <User size={20} className="text-brand-600" />
          {t('seller.profile.personalInfo')}
        </h3>

        <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">{t('seller.profile.fullName')}</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleProfileChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">{t('seller.profile.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleProfileChange}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">{t('seller.profile.phone')}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleProfileChange}
              required
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-line">
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
              {saving && <AlertCircle size={18} className="animate-spin" />}
              {!saving && <Save size={18} />}
            </Button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
          <Lock size={20} className="text-brand-600" />
          {t('seller.profile.changePassword')}
        </h3>

        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          {passwordError && <Alert tone="error">{passwordError}</Alert>}
          {passwordSuccess && <Alert tone="success">{passwordSuccess}</Alert>}

          <div>
            <Label htmlFor="currentPassword">{t('seller.profile.currentPassword')}</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="newPassword">{t('seller.profile.newPassword')}</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="confirmNewPassword">{t('seller.profile.confirmNewPassword')}</Label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                value={passwordData.confirmNewPassword}
                onChange={handlePasswordChange}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-line">
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? t('common.saving') : t('seller.profile.updatePassword')}
              {passwordLoading && <AlertCircle size={18} className="animate-spin" />}
              {!passwordLoading && <Lock size={18} />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}