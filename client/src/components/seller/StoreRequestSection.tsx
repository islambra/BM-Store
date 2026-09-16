import { useEffect, useState } from 'react'
import { Check, CheckCircle, Upload, X, AlertCircle, Clock } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import {
  getMyStoreRequest,
  submitStoreRequest,
  checkSlugAvailability,
  uploadImage,
} from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Input, Textarea, Label, Button } from '../../components/common/FormControls'
import { Alert } from '../../components/common/FormControls'
import ImageUploader from '../../components/common/ImageUploader'
import EmptyState from '../../components/common/EmptyState'
import SectionHeader from '../../components/common/SectionHeader'
import { storeUrl, storeDomainSuffix } from '../../utils/storeUrl'

type RequestState = 'loading' | 'none' | 'pending' | 'approved' | 'rejected'

const wilayas = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', "M'sila", 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
  'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela',
  'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane',
  'El M\u2019Ghair', 'El Meniaa', 'Ouled Djellal', 'Bordj Badji Mokhtar', 'B\u00e9ni Abb\u00e8s', 'Timimoun',
  'Touggourt', 'Djanet', 'In Salah', 'In Guezzam',
]

export default function StoreRequestSection() {
  const { t } = useLanguage()
  const [state, setState] = useState<RequestState>('loading')
  const [paymentInfo, setPaymentInfo] = useState<{
    ccp?: string | null
    ccpKey?: string | null
    baridiMob?: string | null
  } | null>(null)
  const [request, setRequest] = useState<{
    storeName: string
    slug: string
    subscriptionPlan: string
    status: string
    rejectionReason?: string
    expectedAmount: number
    requestDate: string
  } | null>(null)

  useEffect(() => {
    let alive = true
    getMyStoreRequest()
      .then((res) => {
        if (!alive) return
        setPaymentInfo(res.paymentInfo ?? null)
        if (!res.storeRequest) {
          setState('none')
        } else if (res.storeRequest.status === 'approved') {
          setState('approved')
        } else {
          setState(res.storeRequest.status as RequestState)
          setRequest(res.storeRequest)
        }
      })
      .catch(() => {
        if (alive) setState('none')
      })
    return () => { alive = false }
  }, [])

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.storeRequest')} subtitle={t('seller.storeRequestSubtitle')} />
        <div className="animate-pulse rounded-2xl border border-line bg-surface p-6 h-64" />
      </div>
    )
  }

  if (state === 'approved') {
    return (
      <EmptyState
        icon={CheckCircle}
        title={t('seller.requestApproved')}
        description={t('seller.overview.noData')}
      />
    )
  }

  if (state === 'pending' && request) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.storeRequest')} subtitle={t('seller.requestPending')} />
        <div className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">{t('seller.requestPending')}</p>
              <div className="mt-3 space-y-2 text-sm text-ink-600">
                <p><span className="font-medium text-ink-700">{t('seller.storeName')}:</span> {request.storeName}</p>
                <p><span className="font-medium text-ink-700">{t('seller.storeUrl')}:</span> {storeUrl(request.slug)}</p>
                <p><span className="font-medium text-ink-700">{t('seller.subscriptionPlan')}:</span> {t(request.subscriptionPlan === 'monthly' ? 'seller.monthlyPlan' : 'seller.yearlyPlan')}</p>
                <p><span className="font-medium text-ink-700">{t('seller.paymentProof')}:</span> {request.expectedAmount.toLocaleString()} DA</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'rejected') {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.storeRequest')} subtitle={t('seller.requestRejected')} />
        {request?.rejectionReason && (
          <Alert tone="danger">
            <span className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{t('seller.rejectionReason')}</p>
                <p className="mt-1">{request.rejectionReason}</p>
              </div>
            </span>
          </Alert>
        )}
        <StoreRequestForm paymentInfo={paymentInfo} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader title={t('seller.storeRequest')} subtitle={t('seller.storeRequestSubtitle')} />
      <StoreRequestForm paymentInfo={paymentInfo} />
    </div>
  )
}

function StoreRequestForm({ paymentInfo }: {
  paymentInfo: { ccp?: string | null; ccpKey?: string | null; baridiMob?: string | null } | null
}) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [storeLogo, setStoreLogo] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [wilaya, setWilaya] = useState('')
  const [city, setCity] = useState('')
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) { setSlugAvailable(null); return }
    setSlugChecking(true)
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailability(slug)
        setSlugAvailable(res.available)
      } catch {
        setSlugAvailable(null)
      } finally {
        setSlugChecking(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [slug])

  const handleSlugChange = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '')
    setSlug(clean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim() || !slug || !paymentProof) return
    if (slugAvailable === false) return

    setSaving(true)
    setError('')
    try {
      const proofRes = await uploadImage(paymentProof)
      await submitStoreRequest({
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim() || undefined,
        storeLogo: storeLogo || undefined,
        storePhone: storePhone.trim() || undefined,
        wilaya: wilaya || undefined,
        city: city.trim() || undefined,
        slug,
        subscriptionPlan: plan,
        paymentProof: proofRes.url,
      })
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <Check size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">{t('seller.requestPending')}</p>
            <p className="mt-1 text-sm text-ink-500">{t('seller.storeRequestSubtitle')}</p>
          </div>
        </div>
      </div>
    )
  }

  const monthly = plan === 'monthly'
  const amount = monthly ? '2 500' : '25 000'

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {error && (
        <Alert tone="danger">
          <span className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </span>
        </Alert>
      )}

      {/* Plan selection */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <Label>{t('seller.subscriptionPlan')}</Label>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {([['monthly', 'seller.monthlyPlan', 'seller.monthlyPrice', 'seller.monthlyDuration'] as const,
            ['yearly', 'seller.yearlyPlan', 'seller.yearlyPrice', 'seller.yearlyDuration'] as const,
          ]).map(([key, labelKey, priceKey, durationKey]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlan(key)}
              className={`relative rounded-xl border-2 p-4 text-start transition-colors ${
                plan === key ? 'border-brand-600 bg-brand-50' : 'border-line hover:border-ink-900/20'
              }`}
            >
              {plan === key && (
                <div className="absolute end-3 top-3">
                  <Check size={18} className="text-brand-600" />
                </div>
              )}
              <p className="text-sm font-bold text-ink-900">{t(labelKey)}</p>
              <p className="mt-1 text-2xl font-extrabold text-brand-700">{t(priceKey)}</p>
              <p className="mt-1 text-xs text-ink-500">{t(durationKey)}</p>
              {key === 'yearly' && (
                <p className="mt-2 inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {t('seller.yearlyIncludes')}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Store info */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <div>
          <Label>{t('seller.storeName')} *</Label>
          <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} required className="mt-1.5" />
        </div>
        <div>
          <Label>{t('seller.storeDescription')}</Label>
          <Textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={3} className="mt-1.5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t('seller.storePhone')}</Label>
            <Input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>{t('seller.storeLogo')}</Label>
            <div className="mt-1.5">
              <ImageUploader value={storeLogo} onChange={(v) => setStoreLogo(String(v))} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t('seller.wilaya')}</Label>
            <select
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink-700"
            >
              <option value="">{t('seller.wilaya')}</option>
              {wilayas.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <Label>{t('seller.city')}</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        {/* Slug */}
        <div>
          <Label>{t('seller.storeUrl')} *</Label>
          <div className="mt-1.5 flex items-center gap-0 rounded-xl border border-line bg-surface overflow-hidden">
            <input
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={t('seller.storeUrlPlaceholder')}
              required
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm font-medium text-ink-700 placeholder:text-ink-400 focus:outline-none"
            />
            <span className="shrink-0 border-l border-line bg-ink-900/5 px-3 py-2.5 text-sm font-medium text-ink-500">
              {storeDomainSuffix()}
            </span>
          </div>
          {slug && (
            <p className={`mt-1.5 text-xs font-medium ${
              slugChecking ? 'text-ink-400' :
              slugAvailable === true ? 'text-green-600' :
              slugAvailable === false ? 'text-danger-600' : 'text-ink-400'
            }`}>
              {slugChecking ? '...' :
               slugAvailable === true ? t('seller.storeUrlAvailable') :
               slugAvailable === false ? t('seller.storeUrlTaken') : ''}
            </p>
          )}
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <div>
          <Label>{t('seller.paymentInstructions')}</Label>
          <div className="mt-2 rounded-xl bg-ink-900/5 p-4 text-sm text-ink-600 space-y-1.5">
            <p>{t('seller.paymentInstructionsDesc')}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 pt-1">
              <div>
                <p className="font-semibold text-ink-800">
                  {t('seller.ccp')}: <span className="font-mono">{paymentInfo?.ccp || t('seller.paymentNotSet')}</span>
                </p>
                {paymentInfo?.ccpKey && (
                  <p className="text-xs text-ink-500">
                    {t('seller.ccpKey')}: <span className="font-mono">{paymentInfo.ccpKey}</span>
                  </p>
                )}
              </div>
              <div>
                <p className="font-semibold text-ink-800">
                  {t('seller.baridiMob')}:{' '}
                  <span className="font-mono">{paymentInfo?.baridiMob || t('seller.paymentNotSet')}</span>
                </p>
              </div>
            </div>
            <p className="pt-1.5 font-bold text-brand-700">
              {t('seller.subscriptionPlan')}: {amount} DA
            </p>
          </div>
        </div>
        <div>
          <Label>{t('seller.paymentProof')} *</Label>
          <p className="mt-1 text-xs text-ink-500">{t('seller.paymentProofDesc')}</p>
          <div className="mt-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setPaymentProof(file)
                setPaymentProofUrl(file ? URL.createObjectURL(file) : null)
              }}
              className="sr-only"
              id="proof-upload"
            />
            {paymentProofUrl ? (
              <div className="relative inline-block">
                <img src={paymentProofUrl} alt="" className="h-24 rounded-xl border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => { setPaymentProof(null); setPaymentProofUrl(null) }}
                  className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="proof-upload"
                className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-line p-4 text-sm font-medium text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <Upload size={18} />
                {t('seller.paymentProof')}
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="submit"
          disabled={saving || !storeName.trim() || !slug || slugAvailable === false || !paymentProof}
        >
          {saving ? '...' : t('seller.submitRequest')}
        </Button>
      </div>
    </form>
  )
}
