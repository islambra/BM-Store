import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Calendar, Play, MessageSquare } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import type { PostItem } from '../../services/catalog'

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso))
  } catch {
    return ''
  }
}

/**
 * Compact view-only post preview for the homepage / related sections.
 * The whole card links to the POST (`/posts/:id`). No like / comment
 * actions here — those live on the full post view.
 */
export default function PostPreviewCard({ post }: { post: PostItem }) {
  const { t, lang } = useLanguage()
  const rtl = lang === 'ar'
  const ArrowIcon = rtl ? ArrowLeft : ArrowRight
  const text = rtl ? post.textAr || post.textEn : post.textEn || post.textAr
  const postUrl = `/posts#post-${post.id}`
  const isVideo = post.mediaType === 'video' && post.video

  return (
    <Link
      to={postUrl}
      aria-label={t('posts.viewPost')}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:border-brand-200 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5"
    >
      {/* Media */}
      <span className="relative block aspect-[16/10] overflow-hidden bg-ink-900/5">
        {isVideo && post.images.length === 0 ? (
          <video src={post.video ?? undefined} className="h-full w-full object-cover" preload="metadata" playsInline muted />
        ) : post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.06]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-canvas">
            <MessageSquare size={22} className="text-brand-200" />
          </span>
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-lg transition-transform duration-300 motion-safe:group-hover:scale-110">
              <Play size={15} fill="currentColor" />
            </span>
          </span>
        )}
        <span className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-brand-700 opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:opacity-100">
          <ArrowIcon size={14} />
        </span>
      </span>

      {/* Text */}
      <span className="flex min-w-0 flex-1 flex-col p-3">
        {text ? (
          <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900">{text}</span>
        ) : (
          <span className="line-clamp-2 text-[13px] text-ink-400 italic">
            {rtl ? 'منشور من BM Store' : 'A new update from BM Store'}
          </span>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium tabular-nums text-ink-400">
          <Calendar size={11} />
          {formatDate(post.createdAt, rtl ? 'ar-DZ' : 'en-US')}
        </span>
      </span>
    </Link>
  )
}
