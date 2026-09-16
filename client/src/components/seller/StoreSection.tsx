import { useEffect, useState } from 'react'
import { Check, Link2, Copy, Save, Shield } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { getMyStore, updateMyStore } from '../../services/api'
import { getErrorMessage } from '../../services/api'
import SectionHeader from '../../components/common/SectionHeader'
import { Alert } from '../../components/common/FormControls'
import { Input, Textarea, Label, Button } from '../../components/common/FormControls'
import ImageUploader from '../../components/common/ImageUploader'
import { storeUrl } from '../../utils/storeUrl'

export default function SellerStoreSection() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    phone: '',
    wilaya: '',
    city: '',
  })
  const [storeUrlValue, setStoreUrlValue] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    getMyStore()
      .then((res) => {
        if (!alive || !res.store) return
        setFormData({
          name: res.store.name || '',
          description: res.store.description || '',
          logo: res.store.logo || '',
          phone: res.store.phone || '',
          wilaya: res.store.wilaya || '',
          city: res.store.city || '',
        })
        setStoreUrlValue(storeUrl(res.store.slug))
      })
      .catch((err) => {
        if (alive) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(storeUrlValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(t('seller.store.copyFailed'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title={t('seller.store.info')} subtitle={t('seller.store.infoDesc')} />
        <div className="animate-pulse space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5 h-72" />
        </div>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateMyStore(formData)
      setSuccess(t('seller.store.saved'))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SectionHeader title={t('seller.store.info')} subtitle={t('seller.store.infoDesc')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label htmlFor="logo">{t('seller.store.logo')}</Label>
            <ImageUploader
              value={formData.logo}
              onChange={(url) => setFormData((prev) => ({ ...prev, logo: String(url) }))}
              accept="image/*"
            />
          </div>

          <div>
            <Label htmlFor="name">{t('seller.store.name')}</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('seller.store.namePlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="description">{t('seller.store.description')}</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder={t('seller.store.descriptionPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="phone">{t('seller.store.phone')}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('seller.store.phonePlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="wilaya">{t('seller.wilaya')}</Label>
            <Input
              id="wilaya"
              name="wilaya"
              value={formData.wilaya}
              onChange={handleChange}
              placeholder={t('seller.wilayaPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="city">{t('seller.city')}</Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder={t('seller.cityPlaceholder')}
            />
          </div>

          <div className="bg-ink-900/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-700 mb-2">
              <Link2 size={16} />
              {t('seller.store.url')}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={storeUrlValue}
                readOnly
                className="flex-1 bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm font-mono text-ink-900"
              />
              <button
                type="button"
                onClick={() => void copyUrl()}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                title={t('seller.store.copyUrl')}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className="hidden sm:inline">{copied ? t('seller.store.copied') : t('seller.store.copyUrl')}</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-500">{t('seller.store.urlLocked')}</p>
          </div>

          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-brand-700 mb-2">
              <Shield size={16} />
              {t('seller.store.subscriptionInfo')}
            </div>
            <p className="text-sm text-brand-600">
              {t('seller.store.subscriptionInfoDesc')}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert tone="error">{error}</Alert>
      )}

      {success && (
        <Alert tone="success">{success}</Alert>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-line">
        <Button type="submit" disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
          <Save size={16} className={saving ? 'animate-spin' : ''} />
        </Button>
      </div>
    </form>
  )
}