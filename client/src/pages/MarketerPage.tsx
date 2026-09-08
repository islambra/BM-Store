import { useState } from 'react'
import { Copy, Check, UserRound, Megaphone, Link2, Wallet, LoaderCircle, CheckCircle2, CreditCard, Smartphone } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import * as api from '../services/api'
import { getErrorMessage } from '../services/api'
import PageHeader from '../components/common/PageHeader'
import { Alert, Input, Textarea } from '../components/common/FormControls'
import { formatPrice } from '../components/common/Price'

function Loader() {
  const { t } = useLanguage()
  return (
    <p className="flex items-center gap-2 py-8 text-sm text-ink-500">
      <LoaderCircle size={18} className="animate-spin" />
      {t('common.loading')}
    </p>
  )
}

function ErrorNote({ message }: { message: string }) {
  return <Alert tone="danger">{message}</Alert>
}

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Megaphone; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <Icon size={18} className="text-brand-600" />
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-ink-400">{hint}</p>}
    </div>
  )
}

function ReferralCard({ data, t }: { data: api.MarketerProfilePayload; t: (k: string, vars?: Record<string, string | number>) => string }) {
  const [copied, setCopied] = useState(false)
  const link = data.profile.referralLink

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const el = document.createElement('textarea')
      el.value = link
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <Link2 size={16} className="text-brand-600" />
        {t('marketer.referralLink')}
      </h3>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-3">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:flex">
            <Megaphone size={16} />
          </span>
          <code dir="ltr" className="min-w-0 truncate text-sm font-semibold text-ink-900">{link}</code>
        </div>
        <button type="button" onClick={() => void copy()} className="btn-primary shrink-0">
          {copied ? <Check size={16} className="text-success-500" /> : <Copy size={16} />}
          {copied ? t('marketer.copied') : t('marketer.copy')}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-400">
        {t('marketer.referralHint', { code: data.profile.referralCode, commission: '10%' })}
      </p>
    </div>
  )
}

function OverviewTab() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getMarketerMe())

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const com = data.stats.commission
  const fmt = (n: number) => formatPrice(n, 'en')

  return (
    <div className="space-y-5">
      <ReferralCard data={data} t={t} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Link2} label={t('marketer.visits')} value={String(data.stats.visits)} />
        <StatCard icon={CheckCircle2} label={t('marketer.attributed')} value={String(data.stats.attributedOrders)} />
        <StatCard icon={Wallet} label={t('marketer.commissionPending')} value={fmt(com.pending)} />
        <StatCard icon={Wallet} label={t('marketer.commissionApproved')} value={fmt(com.approved)} hint={t('marketer.paidHint', { paid: fmt(com.paid) })} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-bold text-ink-900">{t('marketer.earnings')}</h3>
        <p className="mt-1 text-xs text-ink-500">{t('marketer.earningsSub')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { k: 'commissionPending', v: com.pending },
            { k: 'commissionApproved', v: com.approved },
            { k: 'commissionPaid', v: com.paid },
            { k: 'commissionCancelled', v: com.cancelled },
          ].map((row) => (
            <div key={row.k} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <span className="text-sm text-ink-500">{t(`marketer.${row.k}`)}</span>
              <span className="text-sm font-bold text-ink-900">{fmt(row.v)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          {t('marketer.payoutNote', { method: 'CCP / BaridiMob' })}
        </p>
        <button type="button" onClick={() => void reload()} className="btn-secondary mt-4">
          {t('common.refresh')}
        </button>
      </div>
    </div>
  )
}

function ProfileTab() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getMarketerMe())
  const [next, setNext] = useState<{ publicName: string; bio: string; ccp: string; baridiMob: string }>({
    publicName: '',
    bio: '',
    ccp: '',
    baridiMob: '',
  })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const p = data.profile
  const pd = p.payoutDetails ?? { ccp: '', baridiMob: '' }

  const save = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await api.updateMarketerMe({
        publicName: next.publicName || p.publicName,
        bio: next.bio || p.bio || '',
        payoutDetails: {
          ccp: next.ccp || pd.ccp || '',
          baridiMob: next.baridiMob || pd.baridiMob || '',
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

  return (
    <div className="max-w-2xl space-y-5">
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <UserRound size={16} className="text-brand-600" />
          {t('marketer.publicProfile')}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="label">{t('marketer.publicName')}</span>
            <Input defaultValue={p.publicName} onBlur={(e) => setNext((s) => ({ ...s, publicName: e.target.value }))} />
          </label>
        </div>
        <label className="mt-3 block space-y-1.5">
          <span className="label">{t('marketer.bio')}</span>
          <Textarea defaultValue={p.bio ?? ''} onBlur={(e) => setNext((s) => ({ ...s, bio: e.target.value }))} rows={3} />
        </label>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <Wallet size={16} className="text-brand-600" />
          {t('marketer.payoutDetails')}
        </h3>
        <p className="mt-1 text-xs text-ink-500">{t('marketer.payoutDetailsSub')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="label flex items-center gap-1.5">
              <CreditCard size={14} className="text-ink-400" />
              {t('marketer.ccp')}
            </span>
            <Input defaultValue={pd.ccp ?? ''} dir="ltr" onBlur={(e) => setNext((s) => ({ ...s, ccp: e.target.value }))} placeholder="CCP" />
          </label>
          <label className="space-y-1.5">
            <span className="label flex items-center gap-1.5">
              <Smartphone size={14} className="text-ink-400" />
              {t('marketer.baridiMob')}
            </span>
            <Input defaultValue={pd.baridiMob ?? ''} dir="ltr" onBlur={(e) => setNext((s) => ({ ...s, baridiMob: e.target.value }))} placeholder="BaridiMob" />
          </label>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">{t('marketer.payoutMonthly')}</p>
      </div>

      <button type="button" onClick={() => void save()} disabled={busy} className="btn-primary">
        {t('marketer.saveChanges')}
      </button>
    </div>
  )
}

const tabs = [
  { id: 'overview', labelKey: 'marketer.tabOverview', icon: Megaphone },
  { id: 'profile', labelKey: 'marketer.tabProfile', icon: UserRound },
] as const

type TabId = (typeof tabs)[number]['id']

export default function MarketerPage() {
  const { t } = useLanguage()
  const [active, setActive] = useState<TabId>('overview')

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader icon={Megaphone} title={t('marketer.title')} subtitle={t('marketer.subtitle')} />
      <div className="mt-2 flex gap-1 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active === tab.id ? 'bg-brand-600 text-white' : 'bg-surface text-ink-700 hover:bg-ink-900/5'
            }`}
          >
            <tab.icon size={16} />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {active === 'overview' && <OverviewTab />}
        {active === 'profile' && <ProfileTab />}
      </div>
    </div>
  )
}
