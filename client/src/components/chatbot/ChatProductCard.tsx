import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { formatPrice } from '../common/Price'
import { localizedName } from '../../utils/localize'
import { normalizeChatProduct } from '../../utils/chatProduct'
import type { ChatProduct } from '../../utils/chatProduct'

export default function ChatProductCard({
  product,
  onAsk,
}: {
  product: unknown
  onAsk?: (text: string) => void
}) {
  const { lang, t } = useLanguage()
  const item = normalizeChatProduct(product)
  if (!item) return null

  const displayName = localizedName({ name: item.name, nameAr: item.nameAr }, lang)
  const sizeLabel = Object.entries(item.sizes)
    .map(([size, qty]) => (qty > 0 ? size : t('chat.soldOutSize', { size })))
    .join(' · ')

  return (
    <article className="min-w-[168px] max-w-[168px] overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
      {item.image ? (
        <Link to={`/product/${item.id}`} className="block">
          <img src={item.image} alt={displayName} className="h-28 w-full object-cover" />
        </Link>
      ) : (
        <div className="h-28 bg-canvas" />
      )}
      <div className="p-2.5">
        {item.category ? <p className="mb-0.5 text-[11px] text-brand-700">{item.category}</p> : null}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">
          <Link to={`/product/${item.id}`} className="hover:text-brand-700">
            {displayName}
          </Link>
        </h3>
        {item.price != null ? (
          <p className="mt-1 text-sm font-bold text-ink-900">{formatPrice(item.price, lang)}</p>
        ) : null}
        {sizeLabel ? <p className="mt-1 line-clamp-2 text-[10px] text-ink-500">{sizeLabel}</p> : null}
        {!sizeLabel && item.stock != null ? (
          <p className="mt-1 text-[10px] text-ink-500">{t('chat.stock', { count: item.stock })}</p>
        ) : null}
        <AskButton item={item} displayName={displayName} onAsk={onAsk} />
      </div>
    </article>
  )
}

function AskButton({
  item,
  displayName,
  onAsk,
}: {
  item: ChatProduct
  displayName: string
  onAsk?: (text: string) => void
}) {
  const { t } = useLanguage()
  if (!onAsk) return null
  return (
    <button
      type="button"
      onClick={() => onAsk(t('chat.askAbout', { name: displayName, id: item.id }))}
      className="mt-2 w-full rounded-lg bg-ink-900 py-1.5 text-xs text-white hover:bg-ink-700"
    >
      {t('chat.askCta')}
    </button>
  )
}
