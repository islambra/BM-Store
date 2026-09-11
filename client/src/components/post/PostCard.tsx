import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Calendar, ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, Store, Loader2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/api'
import type { PostItem } from '../../services/catalog'
import CommentsSection from './CommentsSection'
import ShareModal from './ShareModal'

export default function PostCard({ post, single = false }: { post: PostItem; single?: boolean }) {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const rtl = lang === 'ar'
  const ArrowIcon = rtl ? ArrowLeft : ArrowRight
  const text = rtl ? (post.textAr || post.textEn) : (post.textEn || post.textAr)
  const productName = rtl ? (post.product.nameAr || post.product.name) : post.product.name
  const title = text?.split('\n')[0] || (rtl ? 'منشور جديد' : 'New post')

  const [liked, setLiked] = useState(post.userLiked)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [likeBusy, setLikeBusy] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(single)
  const [commentsCount, setCommentsCount] = useState(post.commentsCount)
  const [shareOpen, setShareOpen] = useState(false)

  const date = new Intl.DateTimeFormat(rtl ? 'ar-DZ' : 'en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(post.createdAt))

  const goToLogin = () => navigate('/login', { state: { from: location.pathname } })

  const handleLike = async () => {
    if (likeBusy) return
    if (!user) {
      goToLogin()
      return
    }
    const prevLiked = liked
    const prevCount = likesCount
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikesCount((n) => Math.max(0, n + (nextLiked ? 1 : -1)))
    setLikeBusy(true)
    try {
      const res = nextLiked ? await api.likePost(post.id) : await api.unlikePost(post.id)
      setLiked(res.liked)
      setLikesCount(res.likesCount)
    } catch {
      setLiked(prevLiked)
      setLikesCount(prevCount)
    } finally {
      setLikeBusy(false)
    }
  }

  const share = async () => {
    const url = `${window.location.origin}/posts#post-${post.id}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url, title })
        return
      } catch {
        /* cancelled -> fall back to modal */
      }
    }
    setShareOpen(true)
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-all duration-300 hover:border-brand-200 hover:shadow-soft">
      {/* Header — store identity + date */}
      <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3 lg:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white ring-2 ring-brand-100">
          <Store size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight text-ink-900">{t('brand.storeName')}</p>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] leading-tight text-ink-400">
            <Calendar size={11} />
            {date}
          </span>
        </div>
      </div>

      {/* Main split: vertical on mobile, horizontal compact on desktop */}
      <div className={`flex flex-col gap-2.5 lg:gap-0 ${single ? '' : 'lg:flex-row'}`}>
        {/* Media — full width on mobile, ~42% side panel on desktop */}
        <div className={`px-4 ${single ? 'sm:px-5' : 'lg:w-[42%] lg:shrink-0 lg:px-0 lg:ps-4'}`}>
          <PostMediaCarousel images={post.images} video={post.video} compact={!single} />
        </div>

        {/* Content side */}
        <div className="flex min-w-0 flex-1 flex-col px-4 pb-3 lg:px-4 lg:pb-4 lg:pt-0.5">
          {text ? (
            <p className={`whitespace-pre-line text-[13px] leading-relaxed text-ink-800 ${single ? '' : 'line-clamp-4'}`}>
              {text}
            </p>
          ) : (
            <p className="text-[13px] text-ink-400 italic">
              {rtl ? 'منشور من BM Store' : 'A new update from BM Store'}
            </p>
          )}

          {/* Linked product — labelled section, fully clickable */}
          <p className="mb-1 mt-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{t('posts.featuredProduct')}</p>
          <Link
            to={`/product/${post.product.slug}`}
            className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas px-2.5 py-2 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
          >
            <img
              src={post.product.image}
              alt={productName}
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight text-ink-900">{productName}</p>
              <div className="mt-0.5 flex items-baseline gap-1.5 leading-tight">
                <span className="text-[13px] font-bold text-brand-700">
                  {post.product.price.toLocaleString()} <span className="text-[10px] font-semibold">DA</span>
                </span>
                {post.product.isSpecialOffer && post.product.oldPrice && post.product.oldPrice > post.product.price && (
                  <span className="text-[11px] text-ink-400 line-through">{post.product.oldPrice.toLocaleString()} DA</span>
                )}
              </div>
            </div>
            <ArrowIcon size={15} className="shrink-0 text-ink-300 transition-colors group-hover:text-brand-600" />
          </Link>

          {/* Like count — small, subtle, above the action row */}
          {likesCount > 0 && (
            <p className="mt-2 text-[11px] font-medium tabular-nums text-ink-500">
              {t('posts.likesCount', { count: likesCount })}
            </p>
          )}

          {/* Action row — subtle equal-weight items */}
          <div className="mt-1.5 flex items-center border-t border-line pt-1">
            <div className="flex flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => void handleLike()}
                disabled={likeBusy}
                aria-pressed={liked}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors duration-200 ${
                  liked ? 'text-danger-500' : 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-800'
                }`}
              >
                {likeBusy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                )}
                {liked ? t('posts.liked') : t('posts.like')}
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => setCommentsOpen((v) => !v)}
                aria-expanded={commentsOpen}
                className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold transition-colors duration-200 ${
                  commentsOpen ? 'text-brand-600' : 'text-ink-500 hover:bg-ink-900/5 hover:text-ink-800'
                }`}
              >
                <MessageCircle size={16} />
                {commentLabel(commentsCount, single, commentsOpen, t('posts.comments'), t('posts.viewComments'))}
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => void share()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-semibold text-ink-500 transition-colors duration-200 hover:bg-ink-900/5 hover:text-ink-800"
              >
                <Share2 size={16} />
                {t('posts.share')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments — expandable, full-width below, scroll-capped on desktop */}
      {commentsOpen && (
        <div className="border-t border-line bg-canvas/40 px-4 py-3 lg:max-h-[300px] lg:overflow-y-auto lg:px-5 lg:py-4">
          <CommentsSection postId={post.id} onCountChange={setCommentsCount} />
        </div>
      )}

      <ShareModal
        open={shareOpen}
        url={`${window.location.origin}/posts#post-${post.id}`}
        title={title}
        onClose={() => setShareOpen(false)}
      />
    </article>
  )
}

function commentLabel(
  count: number,
  single: boolean,
  open: boolean,
  commentsKey: string,
  viewKey: string,
) {
  if (count > 0) {
    return open ? `${count} ${commentsKey}` : viewKey
  }
  return single ? commentsKey : viewKey
}

/* ------------------------------------------------------------------ */
/* Media carousel — one item visible, swipe + arrows + dots            */
/* ------------------------------------------------------------------ */

interface MediaItem {
  kind: 'image' | 'video'
  src: string
}

function PostMediaCarousel({ images, video, compact = false }: { images: string[]; video?: string | null; compact?: boolean }) {
  const items: MediaItem[] = [
    ...(images ?? []).map((src) => ({ kind: 'image' as const, src })),
    ...(video ? [{ kind: 'video' as const, src: video }] : []),
  ]
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const dragStartX = useRef<number | null>(null)
  const dragging = useRef(false)

  // Reset when media changes (different post)
  useEffect(() => {
    setIndex(0)
  }, [images?.length, video])

  if (items.length === 0) return null

  const count = items.length
  const goTo = (i: number) => setIndex(((i % count) + count) % count)
  const next = () => goTo(index + 1)
  const prev = () => goTo(index - 1)

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) next()
    else prev()
  }

  const onMouseDown = (e: React.MouseEvent) => {
    // Don't hijack drags that start on the video controls
    if ((e.target as HTMLElement).closest('video')) return
    dragging.current = true
    dragStartX.current = e.clientX
  }
  const onMouseUp = (e: React.MouseEvent) => {
    if (!dragging.current || dragStartX.current == null) return
    const dx = e.clientX - dragStartX.current
    dragging.current = false
    dragStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) next()
    else prev()
  }

  return (
    <div
      className="group/media relative w-full select-none overflow-hidden rounded-xl border border-line bg-ink-900/[0.05] shadow-sm"
      dir="ltr"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      {/* Sliding track — exactly one slide visible */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((item, i) => (
          <div
            key={`${item.kind}-${i}`}
            className={`flex w-full shrink-0 items-center justify-center overflow-hidden ${
              compact ? 'h-[240px] sm:h-[280px] lg:h-[272px]' : 'h-[260px] sm:h-[360px]'
            }`}
            aria-hidden={i !== index}
          >
            {item.kind === 'video' ? (
              <video
                src={item.src}
                controls
                preload="metadata"
                playsInline
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              <img
                src={item.src}
                alt=""
                draggable={false}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {/* Prev / Next — subtle, desktop hover, hidden on touch */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous media"
            className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-all hover:bg-black/60 group-hover/media:opacity-100 sm:flex"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next media"
            className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-all hover:bg-black/60 group-hover/media:opacity-100 sm:flex"
          >
            <ChevronRight size={18} />
          </button>

          {/* Counter */}
          <span className="pointer-events-none absolute end-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {index + 1}/{count}
          </span>

          {/* Dots with readability scrim */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/45 to-transparent pb-2 pt-5">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
          {/* Clickable dots layer (accessible) */}
          <div className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-2 opacity-0">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to media ${i + 1}`}
                className="h-4 w-6"
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}