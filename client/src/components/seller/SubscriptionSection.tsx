import { useEffect, useState } from 'react'
import { AlertCircle, CreditCard, RefreshCw, Shield } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { getMySubscription, submitRenewalRequest, uploadImage } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'
import { Button } from '../../components/common/FormControls'

export default function SellerSubscriptionSection() {
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [subscription, setSubscription] = useState<{
    plan: string
    status: string
    startDate: string | null
    endDate: string | null
    daysRemaining: number
    isExpiringSoon: boolean
  } | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<{
    ccp?: string | null
    ccpKey?: string | null
    baridiMob?: string | null
  } | null>(null)
  const [renewalPlan, setRenewalPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    getMySubscription()
      .then((res) => {
        if (alive && res.subscription) {
          setSubscription(res.subscription)
          setPaymentInfo(res.paymentInfo ?? null)
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

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentProof) {
      setError(t('seller.subscription.paymentProofRequired'))
      return
    }

    setRenewing(true)
    setError('')
    setSuccess('')

    try {
      const proofUrl = paymentProof ? await uploadImage(paymentProof) : null
      await submitRenewalRequest({ subscriptionPlan: renewalPlan, paymentProof: proofUrl?.url || '' })
      setSuccess(t('seller.subscription.renewalSubmitted'))
      setPaymentProof(null)
      setPaymentProofUrl(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setRenewing(false)
    }
  }

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'monthly': return t('seller.subscription.monthly')
      case 'yearly': return t('seller.subscription.yearly')
      default: return plan
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('seller.subscription.active')
      case 'expired': return t('seller.subscription.expired')
      case 'pending': return t('admin.statusPending')
      case 'suspended': return t('admin.statusSuspended')
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.subscription.title')} subtitle={t('seller.subscription.subtitle')} />
        <div className="animate-pulse space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5 h-64" />
          <div className="rounded-2xl border border-line bg-surface p-5 h-80" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.subscription.title')} subtitle={t('seller.subscription.subtitle')} />
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.subscription.title')} subtitle={t('seller.subscription.subtitle')} />
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <Shield size={48} className="mx-auto text-ink-400" />
          <h3 className="mt-4 text-lg font-semibold text-ink-900">{t('common.empty')}</h3>
          <p className="mt-1 text-ink-500">{t('seller.subscription.noData')}</p>
        </div>
      </div>
    )
  }

  const isExpired = subscription.status === 'expired'
  const isExpiringSoon = subscription.isExpiringSoon

  return (
    <div className="space-y-6">
      <SectionHeader title={t('seller.subscription.title')} subtitle={t('seller.subscription.subtitle')} />

      {/* Current Subscription */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-lg font-semibold text-ink-900">{t('seller.subscription.currentPlan')}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-ink-500">{t('seller.subscription.plan')}</p>
            <p className="mt-1 text-xl font-bold text-ink-900">{getPlanLabel(subscription.plan)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-500">{t('seller.subscription.status')}</p>
            <p className="mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
                subscription.status === 'active' ? 'bg-brand-50 text-brand-700' :
                subscription.status === 'expired' ? 'bg-red-50 text-red-600' :
                subscription.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                'bg-gray-50 text-gray-600'
              }`}>
                {getStatusLabel(subscription.status)}
              </span>
              {isExpiringSoon && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-600">
                  <AlertCircle size={12} />
                  {t('seller.subscription.expiringSoon')}
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-500">{t('seller.subscription.startDate')}</p>
            <p className="mt-1 text-lg font-bold text-ink-900">
              {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink-500">{t('seller.subscription.endDate')}</p>
            <p className="mt-1 text-lg font-bold text-ink-900">
              {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US') : '-'}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-ink-500">{t('seller.subscription.daysRemaining')}</p>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex-1 h-3 bg-ink-900/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  subscription.daysRemaining <= 7 ? 'bg-red-500' :
                  subscription.daysRemaining <= 30 ? 'bg-amber-500' :
                  'bg-brand-600'
                }`}
                style={{ width: `${Math.min(100, (subscription.daysRemaining / 365) * 100)}%` }}
              />
            </div>
            <span className="text-lg font-bold text-ink-900 whitespace-nowrap">
              {subscription.daysRemaining} {t('common.days', { count: subscription.daysRemaining })}
            </span>
          </div>
        </div>

        {isExpiringSoon && (
          <div className="mt-4">
            <Alert tone="warning">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <AlertCircle size={16} />
                {t('seller.subscription.warning', { days: subscription.daysRemaining })}
              </span>
            </Alert>
          </div>
        )}

        {isExpired && (
          <div className="mt-4">
            <Alert tone="error">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <AlertCircle size={16} />
                {t('seller.subscription.expiredDesc')}
              </span>
            </Alert>
          </div>
        )}
      </div>

      {/* Renewal Form */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-lg font-semibold text-ink-900">{t('seller.subscription.renew')}</h3>
        <p className="mt-1 text-sm text-ink-500">{t('seller.subscription.renewDesc')}</p>

        {subscription.daysRemaining > 0 && (
          <div className="mt-3">
            <Alert tone="info">{t('seller.subscription.carryOver', { days: subscription.daysRemaining })}</Alert>
          </div>
        )}

        <form onSubmit={handleRenewalSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">{t('seller.subscription.plan')}</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                renewalPlan === 'monthly' ? 'border-brand-600 bg-brand-50' : 'border-line hover:border-brand-300'
              }`}>
                <input
                  type="radio"
                  name="plan"
                  value="monthly"
                  checked={renewalPlan === 'monthly'}
                  onChange={(e) => setRenewalPlan(e.target.value as 'monthly' | 'yearly')}
                  className="sr-only"
                />
                <div className="text-center">
                  <p className="font-semibold text-ink-900">{t('seller.monthlyPlan')}</p>
                  <p className="text-2xl font-extrabold text-brand-600">{t('seller.monthlyPrice')}</p>
                  <p className="text-sm text-ink-500">{t('seller.monthlyDuration')}</p>
                </div>
              </label>
              <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                renewalPlan === 'yearly' ? 'border-brand-600 bg-brand-50' : 'border-line hover:border-brand-300'
              }`}>
                <input
                  type="radio"
                  name="plan"
                  value="yearly"
                  checked={renewalPlan === 'yearly'}
                  onChange={(e) => setRenewalPlan(e.target.value as 'monthly' | 'yearly')}
                  className="sr-only"
                />
                <div className="text-center">
                  <p className="font-semibold text-ink-900">{t('seller.yearlyPlan')}</p>
                  <p className="text-2xl font-extrabold text-brand-600">{t('seller.yearlyPrice')}</p>
                  <p className="text-sm text-ink-500">{t('seller.yearlyDuration')} ({t('seller.yearlyIncludes')})</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">{t('seller.paymentProof')}</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setPaymentProof(file)
                    setPaymentProofUrl(URL.createObjectURL(file))
                  }
                }}
                className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
              />
              <div className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                paymentProof ? 'border-brand-600 bg-brand-50' : 'border-line hover:border-brand-300'
              }`}>
                {paymentProof && paymentProofUrl ? (
                  <>
                    <img src={paymentProofUrl} alt="Payment proof" className="mx-auto h-32 w-auto rounded-lg object-cover mb-2" />
                    <p className="text-sm font-medium text-ink-900">{paymentProof.name}</p>
                    <p className="text-xs text-ink-500 mt-1">{(paymentProof.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <CreditCard size={32} className="mx-auto text-ink-400 mb-2" />
                    <p className="text-sm font-medium text-ink-500">{t('seller.paymentProofUpload')}</p>
                    <p className="text-xs text-ink-400 mt-1">{t('seller.paymentProofTypes')}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && <Alert tone="error">{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}

          <Button type="submit" className="w-full" disabled={renewing || !paymentProof}>
            {renewing ? t('common.saving') : t('seller.subscription.renewCta')}
            {renewing && <RefreshCw size={18} className="animate-spin" />}
          </Button>
        </form>
      </div>

      {/* Payment Instructions */}
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
          <CreditCard size={20} className="text-brand-600" />
          {t('seller.paymentInstructions')}
        </h3>
        <p className="mt-2 text-sm text-ink-500">{t('seller.paymentInstructionsDesc')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-brand-50 p-4">
            <p className="font-medium text-brand-700">{t('seller.ccp')}</p>
            {paymentInfo?.ccp ? (
              <>
                <p className="mt-1 font-mono text-lg text-brand-900">{paymentInfo.ccp}</p>
                {paymentInfo.ccpKey && (
                  <p className="mt-1 text-xs text-brand-600">
                    {t('seller.ccpKey')}: <span className="font-mono">{paymentInfo.ccpKey}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-brand-600">{t('seller.paymentNotSet')}</p>
            )}
          </div>
          <div className="rounded-xl bg-brand-50 p-4">
            <p className="font-medium text-brand-700">{t('seller.baridiMob')}</p>
            {paymentInfo?.baridiMob ? (
              <p className="mt-1 font-mono text-lg text-brand-900">{paymentInfo.baridiMob}</p>
            ) : (
              <p className="mt-1 text-sm text-brand-600">{t('seller.paymentNotSet')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}