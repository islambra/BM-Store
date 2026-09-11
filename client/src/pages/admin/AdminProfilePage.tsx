import { useState, useEffect } from 'react'
import { UserRound, KeyRound, Shield, Bell } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Alert, Field, Input } from '../../components/common/FormControls'
import AdminDashboardLayout from '../../components/admin/AdminDashboardLayout'

const sectionCards = [
  {
    id: 'profile',
    icon: UserRound,
    title: 'admin.profile.sections.profileInfo',
    description: 'admin.profile.sections.profileInfoDesc',
  },
  {
    id: 'security',
    icon: Shield,
    title: 'admin.profile.sections.security',
    description: 'admin.profile.sections.securityDesc',
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'admin.profile.sections.notifications',
    description: 'admin.profile.sections.notificationsDesc',
  },
]

export default function AdminProfilePage() {
  const { t } = useLanguage()
  const { user } = useAuth()

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'notifications'>('profile')

  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' })
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [profileError, setProfileError] = useState('')

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdNotice, setPwdNotice] = useState('')
  const [pwdError, setPwdError] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({ name: user.name, phone: user.phone ?? '' })
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
    <AdminDashboardLayout
      pageTitle={t('admin.tabs.profile')}
      pageSubtitle={t('admin.profileSubtitle')}
    >
      <div className="flex gap-6 lg:gap-8">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <nav className="rounded-2xl border border-line bg-surface p-3 space-y-1" aria-label={t('admin.profile.sectionsTitle')}>
            {sectionCards.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id as typeof activeSection)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-700 hover:bg-ink-900/5'
                }`}
              >
                <section.icon size={18} aria-hidden="true" />
                <span>{t(section.title)}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-center gap-3">
                  <UserRound size={20} className="text-brand-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">{t('admin.profile.sections.profileInfo')}</h2>
                    <p className="text-sm text-ink-500">{t('admin.profile.sections.profileInfoDesc')}</p>
                  </div>
                </div>

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

                <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="mt-6 space-y-4 sm:grid sm:grid-cols-2 sm:gap-4">
                  <Field label={t('admin.name')} required>
                    <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </Field>
                  <Field label={t('checkout.phone')}>
                    <Input dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </Field>
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" disabled={profileBusy} className="btn-primary">
                      {t('admin.editProfile')}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-center gap-3">
                  <KeyRound size={20} className="text-brand-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">{t('admin.changePassword')}</h2>
                    <p className="text-sm text-ink-500">{t('admin.profile.sections.passwordDesc')}</p>
                  </div>
                </div>

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

                <form onSubmit={(e) => { e.preventDefault(); savePassword(); }} className="mt-6 space-y-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <Field label={t('admin.currentPassword')} required>
                    <Input dir="ltr" type="password" value={pwd.currentPassword} onChange={(e) => setPwd((f) => ({ ...f, currentPassword: e.target.value }))} />
                  </Field>
                  <Field label={t('admin.newPassword')} required>
                    <Input dir="ltr" type="password" value={pwd.newPassword} onChange={(e) => setPwd((f) => ({ ...f, newPassword: e.target.value }))} />
                  </Field>
                  <Field label={t('admin.confirmPassword')} required>
                    <Input dir="ltr" type="password" value={pwd.confirmPassword} onChange={(e) => setPwd((f) => ({ ...f, confirmPassword: e.target.value }))} />
                  </Field>
                  <div className="sm:col-span-3 flex justify-end">
                    <button type="submit" disabled={pwdBusy} className="btn-primary">
                      {t('admin.changePassword')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-brand-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">{t('admin.profile.sections.security')}</h2>
                    <p className="text-sm text-ink-500">{t('admin.profile.sections.securityDesc')}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-line bg-ink-900/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                        <KeyRound size={18} />
                      </div>
                      <div>
                        <h3 className="font-medium text-ink-900">{t('admin.profile.security.twoFactor')}</h3>
                        <p className="text-sm text-ink-500">{t('admin.profile.security.twoFactorDesc')}</p>
                      </div>
                    </div>
                    <button type="button" className="btn-secondary text-sm">{t('admin.profile.security.enable')}</button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line bg-ink-900/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                        <Bell size={18} />
                      </div>
                      <div>
                        <h3 className="font-medium text-ink-900">{t('admin.profile.security.loginAlerts')}</h3>
                        <p className="text-sm text-ink-500">{t('admin.profile.security.loginAlertsDesc')}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-ink-900/10 peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:border after:border-ink-300 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-brand-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-ink-900">{t('admin.profile.sections.notifications')}</h2>
                    <p className="text-sm text-ink-500">{t('admin.profile.sections.notificationsDesc')}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {[
                    { key: 'orders', label: 'admin.profile.notifications.orders', desc: 'admin.profile.notifications.ordersDesc' },
                    { key: 'marketing', label: 'admin.profile.notifications.marketing', desc: 'admin.profile.notifications.marketingDesc' },
                    { key: 'security', label: 'admin.profile.notifications.security', desc: 'admin.profile.notifications.securityDesc' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-line bg-ink-900/5 p-4">
                      <div>
                        <h3 className="font-medium text-ink-900">{t(item.label)}</h3>
                        <p className="text-sm text-ink-500">{t(item.desc)}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-ink-900/10 peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:border after:border-ink-300 after:transition-all peer-checked:bg-brand-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminDashboardLayout>
  )
}