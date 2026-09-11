import { useState } from 'react'
import { CreditCard, KeyRound, Phone, ShieldCheck, Smartphone, UserRound, Wallet } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Alert, Field, Input, Textarea } from '../common/FormControls'
import ImageUploader from '../common/ImageUploader'
import { ErrorNote, Loader } from '../admin/adminShared'

export default function ProfileSection() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getMarketerMe())
  const [form, setForm] = useState<{
    name: string
    phone: string
    publicName: string
    bio: string
    avatar: string
    ccp: string
    ccpKey: string
    baridiMob: string
  }>({ name: '', phone: '', publicName: '', bio: '', avatar: '', ccp: '', ccpKey: '', baridiMob: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwNotice, setPwNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const p = data.profile
  const pd = p.payoutDetails ?? {}
  const state = form.name ? form : {
    name: p.user?.name ?? '',
    phone: p.user?.phone ?? '',
    publicName: p.publicName,
    bio: p.bio ?? '',
    avatar: p.avatar ?? '',
    ccp: pd.ccp ?? '',
    ccpKey: pd.ccpKey ?? '',
    baridiMob: pd.baridiMob ?? '',
  }

  const save = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await api.updateMarketerMe({
        name: state.name,
        phone: state.phone,
        publicName: state.publicName,
        bio: state.bio,
        avatar: state.avatar || undefined,
        payoutDetails: {
          ccp: state.ccp,
          ccpKey: state.ccpKey,
          baridiMob: state.baridiMob,
        },
      })
      setNotice({ tone: 'success', text: t('marketer.saved') })
      void reload()
    } catch (err) {
      setNotice({ tone: 'danger', text: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async () => {
    setPwBusy(true)
    setPwNotice(null)
    if (!pw.current) {
      setPwNotice({ tone: 'danger', text: t('marketer.currentPassword') })
      setPwBusy(false)
      return
    }
    if (pw.next.length < 8) {
      setPwNotice({ tone: 'danger', text: t('marketer.passwordTooShort') })
      setPwBusy(false)
      return
    }
    if (pw.next !== pw.confirm) {
      setPwNotice({ tone: 'danger', text: t('marketer.passwordsMismatch') })
      setPwBusy(false)
      return
    }
    try {
      await api.changePassword({ currentPassword: pw.current, newPassword: pw.next })
      setPwNotice({ tone: 'success', text: t('marketer.passwordChanged') })
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwNotice({ tone: 'danger', text: getErrorMessage(err) })
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <ShieldCheck size={16} className="text-brand-600" />
          {t('marketer.account')}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t('marketer.fullName')}>
            <Input value={state.name} onChange={(e) => setForm((s) => ({ ...s, ...state, name: e.target.value }))} />
          </Field>
          <Field label={t('marketer.phone')}>
            <Input icon={Phone} dir="ltr" value={state.phone} onChange={(e) => setForm((s) => ({ ...s, ...state, phone: e.target.value }))} />
          </Field>
          <Field label={t('marketer.avatar')} hint={t('marketer.avatarHint')}>
            <ImageUploader value={state.avatar} onChange={(v) => setForm((s) => ({ ...s, ...state, avatar: String(v) }))} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <UserRound size={16} className="text-brand-600" />
          {t('marketer.publicProfile')}
        </h3>
        <div className="mt-4 grid gap-3">
          <Field label={t('marketer.publicName')}>
            <Input value={state.publicName} onChange={(e) => setForm((s) => ({ ...s, ...state, publicName: e.target.value }))} />
          </Field>
          <Field label={t('marketer.bio')}>
            <Textarea value={state.bio} rows={3} onChange={(e) => setForm((s) => ({ ...s, ...state, bio: e.target.value }))} />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Wallet size={16} className="text-brand-600" />
          {t('marketer.payoutDetails')}
        </h3>
        <p className="mt-1 text-xs text-ink-500">{t('marketer.payoutDetailsSub')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t('marketer.ccp')}>
            <Input icon={CreditCard} dir="ltr" value={state.ccp} onChange={(e) => setForm((s) => ({ ...s, ...state, ccp: e.target.value }))} placeholder="CCP" />
          </Field>
          <Field label={t('marketer.ccpKey')}>
            <Input dir="ltr" value={state.ccpKey} onChange={(e) => setForm((s) => ({ ...s, ...state, ccpKey: e.target.value }))} placeholder="clé" />
          </Field>
          <Field label={t('marketer.baridiMob')}>
            <Input icon={Smartphone} dir="ltr" value={state.baridiMob} onChange={(e) => setForm((s) => ({ ...s, ...state, baridiMob: e.target.value }))} placeholder="BaridiMob" />
          </Field>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">{t('marketer.payoutMonthly')}</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <KeyRound size={16} className="text-brand-600" />
          {t('marketer.changePassword')}
        </h3>
        {pwNotice && <div className="mt-3"><Alert tone={pwNotice.tone}>{pwNotice.text}</Alert></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t('marketer.currentPassword')}>
            <Input type="password" dir="ltr" value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} />
          </Field>
          <div />
          <Field label={t('marketer.newPassword')}>
            <Input type="password" dir="ltr" value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} />
          </Field>
          <Field label={t('marketer.confirmNewPassword')}>
            <Input type="password" dir="ltr" value={pw.confirm} onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))} />
          </Field>
        </div>
        <button type="button" onClick={() => void changePassword()} disabled={pwBusy} className="btn-secondary mt-4">
          {t('marketer.changePassword')}
        </button>
      </div>

      <button type="button" onClick={() => void save()} disabled={busy} className="btn-primary">
        {t('marketer.saveChanges')}
      </button>
    </div>
  )
}