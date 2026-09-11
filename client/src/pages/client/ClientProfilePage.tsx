import { useState } from 'react'
import { CheckCircle2, LoaderCircle, Lock, Phone, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Field, Input } from '../../components/common/FormControls'

function Avatar({ name, image, size = 'h-16 w-16 text-2xl' }: { name: string; image: string | null; size?: string }) {
  if (image) {
    return <img src={image} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-brand-100`} />
  }
  const initial = name.trim().charAt(0).toUpperCase() || '؟'
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white ring-2 ring-brand-100`}
    >
      {initial}
    </span>
  )
}

export default function ClientProfilePage() {
  const { t } = useLanguage()
  const { user, refresh } = useAuth()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileOk, setProfileOk] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [passError, setPassError] = useState('')
  const [passOk, setPassOk] = useState('')

  if (!user) return null

  const saveProfile = async () => {
    setProfileError('')
    setProfileOk('')
    const cleanName = name.trim()
    const cleanPhone = phone.trim()
    if (!cleanName) {
      setProfileError(t('client.nameRequired'))
      return
    }
    if (!cleanPhone) {
      setProfileError(t('client.phoneRequired'))
      return
    }
    setProfileBusy(true)
    try {
      await api.updateMe({ name: cleanName, phone: cleanPhone })
      await refresh()
      setProfileOk(t('client.saved'))
    } catch (err) {
      setProfileError(getErrorMessage(err))
    } finally {
      setProfileBusy(false)
    }
  }

  const updatePassword = async () => {
    setPassError('')
    setPassOk('')
    if (!currentPassword) {
      setPassError(t('client.currentRequired'))
      return
    }
    if (newPassword.length < 8) {
      setPassError(t('client.passwordMin'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPassError(t('client.passwordMismatch'))
      return
    }
    setPassBusy(true)
    try {
      await api.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPassOk(t('client.passwordUpdated'))
    } catch (err) {
      setPassError(getErrorMessage(err))
    } finally {
      setPassBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Page title */}
      <h1 className="text-xl font-extrabold tracking-tight text-ink-900">{t('client.profile')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('client.profileSub')}</p>

      {/* Identity card */}
      <section className="mt-5 flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <Avatar name={user.name} image={user.avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-ink-900">{user.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500" dir="ltr">
            <Phone size={13} className="shrink-0 text-ink-400" />
            {user.phone}
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 sm:inline-flex">
          <ShieldCheck size={12} />
          {t('account.roleUser')}
        </span>
      </section>

      {/* Personal information */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold text-ink-900">{t('client.personalInfo')}</h2>
        {profileError && (
          <p role="alert" className="mt-3 rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
            {profileError}
          </p>
        )}
        {profileOk && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-50 px-3.5 py-2.5 text-sm font-medium text-success-700">
            <CheckCircle2 size={16} className="shrink-0" />
            {profileOk}
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t('client.fullName')} required>
            <Input
              icon={User}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('client.fullName')}
              autoComplete="name"
            />
          </Field>
          <Field label={t('client.phone')} required>
            <Input
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('client.phone')}
              autoComplete="tel"
              dir="ltr"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={profileBusy}
            className="btn-primary inline-flex items-center gap-2"
          >
            {profileBusy && <LoaderCircle size={16} className="animate-spin" />}
            {t('client.saveChanges')}
          </button>
        </div>
      </section>

      {/* Security */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Lock size={15} className="text-ink-400" />
          {t('client.changePassword')}
        </h2>
        {passError && (
          <p role="alert" className="mt-3 rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
            {passError}
          </p>
        )}
        {passOk && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-50 px-3.5 py-2.5 text-sm font-medium text-success-700">
            <CheckCircle2 size={16} className="shrink-0" />
            {passOk}
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 sm:max-w-xs">
            <Field label={t('client.currentPassword')} required>
              <Input
                icon={Lock}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          </div>
          <Field label={t('client.newPassword')} required hint={t('client.passwordMin')}>
            <Input
              icon={Lock}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label={t('client.confirmPassword')} required>
            <Input
              icon={Lock}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void updatePassword()}
            disabled={passBusy}
            className="btn-primary inline-flex items-center gap-2"
          >
            {passBusy && <LoaderCircle size={16} className="animate-spin" />}
            {t('client.updatePassword')}
          </button>
        </div>
      </section>
    </div>
  )
}
