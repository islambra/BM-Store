import { useState } from 'react'
import { LoaderCircle, Search } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { formatPrice } from '../common/Price'
import { Input } from '../common/FormControls'
import { CopyButton } from './marketerShared'
import { ErrorNote, Loader } from '../admin/adminShared'

/**
 * Storefront base URL for shareable product referral links.
 * Prefers the server-provided base URL (APP_BASE_URL), then the current
 * origin — never a hardcoded localhost.
 */
function storefrontBase(serverBase?: string): string {
  const raw =
    (typeof serverBase === 'string' && serverBase.trim()) ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  return raw.replace(/\/?$/, '')
}

export default function ReferralLinksSection() {
  const { t } = useLanguage()
  const { data: me, loading, error } = useAsync(() => api.getMarketerMe())
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<api.ProductRecord | null>(null)

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />
  if (!me) return null

  const baseUrl = storefrontBase(me.baseUrl)
  const generalLink = me.profile.referralLink
  const generated = selected ? `${baseUrl}/product/${selected.slug}?ref=${me.profile.referralCode}` : null

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-bold text-ink-900">{t('marketer.generalLink')}</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <code dir="ltr" className="min-w-0 flex-1 truncate rounded-xl border border-line bg-canvas px-4 py-3 text-sm font-semibold text-ink-900">
            {generalLink}
          </code>
          <CopyButton text={generalLink} label={t('marketer.copy')} copiedLabel={t('marketer.copied')} />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-bold text-ink-900">{t('marketer.productLinks')}</h3>
        <p className="mt-1 text-xs text-ink-500">{t('marketer.productLinksSub')}</p>

        {selected ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <code dir="ltr" className="min-w-0 flex-1 truncate rounded-xl border border-line bg-canvas px-4 py-3 text-sm font-semibold text-ink-900">
              {generated}
            </code>
            <CopyButton
              text={generated ?? ''}
              label={t('marketer.copy')}
              copiedLabel={t('marketer.copied')}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-400">{t('marketer.selectProduct')}</p>
        )}

        <div className="mt-4">
          <Input icon={Search} placeholder={t('marketer.searchProduct')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <ProductPicker query={query} selectedId={selected?._id} onSelect={setSelected} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          {t('marketer.productLinkHint', { commission: '10%', code: me.profile.referralCode })}
        </p>
      </div>
    </div>
  )
}

function ProductPicker({
  query,
  selectedId,
  onSelect,
}: {
  query: string
  selectedId?: string
  onSelect: (p: api.ProductRecord) => void
}) {
  const { t, lang } = useLanguage()
  const { data, loading, error } = useAsync(() => api.listProducts({ limit: 50 }))

  if (loading)
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-ink-500">
        <LoaderCircle size={16} className="animate-spin" />
        {t('common.loading')}
      </p>
    )
  if (error) return <ErrorNote message={error} />
  if (!data) return null

  const products = (data.products ?? []).filter((p) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return (
      p.name.toLowerCase().includes(needle) ||
      p.nameAr?.toLowerCase().includes(needle) ||
      p.slug.toLowerCase().includes(needle)
    )
  })

  if (products.length === 0)
    return <p className="py-6 text-sm text-ink-400">{t('common.noResults')}</p>

  return (
    <div className="max-h-80 space-y-1 overflow-y-auto rounded-xl border border-line p-1">
      {products.map((p) => (
        <button
          key={p._id}
          type="button"
          onClick={() => onSelect(p)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors ${
            selectedId === p._id ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-canvas'
          }`}
        >
          <img src={p.thumbnail ?? p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900">{lang === 'ar' && p.nameAr ? p.nameAr : p.name}</span>
            <span className="block text-xs text-ink-400">{formatPrice(p.price, lang)}</span>
          </span>
        </button>
      ))}
    </div>
  )
}