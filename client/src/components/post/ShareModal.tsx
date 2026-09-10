import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link2, MessageCircle, Send, Check, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export default function ShareModal({
  open,
  url,
  title,
  onClose,
}: {
  open: boolean
  url: string
  title: string
  onClose: () => void
}) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  const shareText = `${title} — ${url}`

  const options = [
    {
      label: t('posts.copyLink'),
      icon: copied ? <Check size={18} /> : <Link2 size={18} />,
      className: 'bg-ink-900/5 text-ink-900',
      onClick: () => void copy(),
      hint: copied ? t('posts.linkCopied') : undefined,
    },
    {
      label: 'WhatsApp',
      icon: <MessageCircle size={18} />,
      className: 'bg-[#25D366]/15 text-[#128C7E]',
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'Facebook',
      icon: <span className="text-sm font-black leading-none">f</span>,
      className: 'bg-[#1877F2]/15 text-[#1877F2]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: 'Telegram',
      icon: <Send size={18} className="-scale-x-100 rtl:scale-x-100" />,
      className: 'bg-[#229ED9]/15 text-[#229ED9]',
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
  ]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('posts.shareTitle')}
      className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:items-center"
    >
      <div className="absolute inset-0 animate-fade-in bg-ink-900/70 backdrop-blur-lg" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-pop overflow-hidden rounded-3xl border border-white/10 bg-surface p-6 shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{t('posts.shareTitle')}</h2>
            <p className="mt-1 text-sm text-ink-500">{t('posts.shareSubtitle')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="icon-btn text-ink-400">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {options.map((opt) =>
            'href' in opt ? (
              <a
                key={opt.label}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-brand-200 hover:shadow-soft"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${opt.className}`}>
                  {opt.icon}
                </span>
                <span className="text-sm font-semibold text-ink-900">{opt.label}</span>
              </a>
            ) : (
              <button
                key={opt.label}
                type="button"
                onClick={opt.onClick}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-brand-200 hover:shadow-soft"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${opt.className}`}>
                  {opt.icon}
                </span>
                <span className="text-sm font-semibold text-ink-900">{opt.hint ?? opt.label}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}