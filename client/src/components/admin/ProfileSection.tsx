import { useEffect, useState } from 'react'
import { CreditCard, KeyRound, UserRound } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Alert, Field, Input } from '../common/FormControls'

export default function ProfileSection() {
  const { t } = useLanguage()
  const { user, refresh } = useAuth()

  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' })
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [profileError, setProfileError] = useState('')

  const [payment, setPayment] = useState({ ccp: user?.ccp ?? '', ccpKey: user?.ccpKey ?? '', baridiMob: user?.baridiMob ?? '' })
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [paymentNotice, setPaymentNotice] = useState('')
  const [paymentError, setPaymentError] = useState('')

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdNotice, setPwdNotice] = useState('')
  const [pwdError, setPwdError] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({ name: user.name, phone: user.phone ?? '' })
    setPayment({ ccp: user.ccp ?? '', ccpKey: user.ccpKey ?? '', baridiMob: user.baridiMob ?? '' })
  }, [user])

  if (!user) return null

  const saveProfile = async () => {
    setProfileBusy(true)
    setProfileNotice('')
    setProfileError('')
    try {
      await api.updateMe({ name: form.name, phone: form.phone })
      setProfileNotice(t('admin.profileSaved'))
    } catch (err) {
      setProfileError(getErrorMessage(err))
    } finally {
      setProfileBusy(false)
    }
  }

  const savePayment = async () => {
    setPaymentBusy(true)
    setPaymentNotice('')
    setPaymentError('')
    try {
      await api.updateMe({ ccp: payment.ccp, ccpKey: payment.ccpKey, baridiMob: payment.baridiMob })
      await refresh()
      setPaymentNotice(t('admin.paymentSaved'))
    } catch (err) {
      setPaymentError(getErrorMessage(err))
    } finally {
      setPaymentBusy(false)
    }
  }

  const savePassword = async () => {
    setPwdNotice('')
    setPwdError('')
    if (pwd.newPassword.length < 8) {
      setPwdError(t('admin.passwordTooShort'))
      return
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdError(t('admin.passwordsMismatch'))
      return
    }
    setPwdBusy(true)
    try {
      await api.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword })
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPwdNotice(t('admin.passwordChanged'))
    } catch (err) {
      setPwdError(getErrorMessage(err))
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <UserRound size={16} className="text-brand-600" />
          {t('admin.profile')}
        </h3>
        {profileNotice && (
          <div className="mt-4">
            <Alert tone="success">{profileNotice}</Alert>
          </div>
        )}
        {profileError && (
          <div className="mt-4">
            <Alert tone="danger">{profileError}</Alert>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t('admin.name')} required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label={t('checkout.phone')}>
            <Input dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
        </div>
        <button type="button" onClick={() => void saveProfile()} disabled={profileBusy} className="btn-primary mt-5">
          {t('admin.editProfile')}
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <CreditCard size={16} className="text-brand-600" />
          {t('admin.paymentDetails')}
        </h3>
        <p className="mt-1 text-xs text-ink-500">{t('admin.paymentDetailsDesc')}</p>
        {paymentNotice && (
          <div className="mt-4">
            <Alert tone="success">{paymentNotice}</Alert>
          </div>
        )}
        {paymentError && (
          <div className="mt-4">
            <Alert tone="danger">{paymentError}</Alert>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label={t('admin.ccp')}>
            <Input dir="ltr" value={payment.ccp} onChange={(e) => setPayment((f) => ({ ...f, ccp: e.target.value }))} />
          </Field>
          <Field label={t('admin.ccpKey')}>
            <Input dir="ltr" value={payment.ccpKey} onChange={(e) => setPayment((f) => ({ ...f, ccpKey: e.target.value }))} />
          </Field>
          <Field label={t('admin.baridiMob')}>
            <Input dir="ltr" value={payment.baridiMob} onChange={(e) => setPayment((f) => ({ ...f, baridiMob: e.target.value }))} />
          </Field>
        </div>
        <button type="button" onClick={() => void savePayment()} disabled={paymentBusy} className="btn-primary mt-5">
          {t('admin.editProfile')}
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <KeyRound size={16} className="text-brand-600" />
          {t('admin.changePassword')}
        </h3>
        {pwdNotice && (
          <div className="mt-4">
            <Alert tone="success">{pwdNotice}</Alert>
          </div>
        )}
        {pwdError && (
          <div className="mt-4">
            <Alert tone="danger">{pwdError}</Alert>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label={t('admin.currentPassword')} required>
            <Input dir="ltr" type="password" value={pwd.currentPassword} onChange={(e) => setPwd((f) => ({ ...f, currentPassword: e.target.value }))} />
          </Field>
          <Field label={t('admin.newPassword')} required>
            <Input dir="ltr" type="password" value={pwd.newPassword} onChange={(e) => setPwd((f) => ({ ...f, newPassword: e.target.value }))} />
          </Field>
          <Field label={t('admin.confirmPassword')} required>
            <Input dir="ltr" type="password" value={pwd.confirmPassword} onChange={(e) => setPwd((f) => ({ ...f, confirmPassword: e.target.value }))} />
          </Field>
        </div>
        <button type="button" onClick={() => void savePassword()} disabled={pwdBusy} className="btn-primary mt-5">
          {t('admin.changePassword')}
        </button>
      </div>
    </div>
  )
}