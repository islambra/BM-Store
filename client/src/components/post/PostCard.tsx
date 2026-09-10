import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Calendar, Heart, MessageCircle, Play, Share2, Store, Loader2 } from 'lucide-react'
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(post.userLiked)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [likeBusy, setLikeBusy] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(single)
  const [commentsCount, setCommentsCount] = useState(post.commentsCount)
  const [shareOpen, setShareOpen] = useState(false)

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      void v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

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
    const url = `${window.location.origin}/posts/${post.id}`
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

  const totalEngagement = likesCount + commentsCount

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:border-brand-200 hover:shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
          <Store size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink-900">{t('brand.storeName')}</p>
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
            <Calendar size={11} />
            {date}
          </span>
        </div>
      </div>

      {/* Media */}
      <div className="relative overflow-hidden">
        {post.mediaType === 'video' && post.video ? (
          <div className="relative aspect-video bg-ink-900">
            <video
              ref={videoRef}
              src={post.video}
              className="h-full w-full object-cover"
              preload="metadata"
              controls={playing}
              playsInline
            />
            {!playing && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play video"
                className="absolute inset-0 flex items-center justify-center bg-ink-900/20 transition-colors hover:bg-ink-900/30"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-brand-700 shadow-lg backdrop-blur transition-transform duration-300 group-hover:scale-110">
                  <Play size={24} fill="currentColor" className="ms-0.5" />
                </span>
              </button>
            )}
          </div>
        ) : post.images.length === 1 ? (
          <div className="aspect-video">
            <img
              src={post.images[0]}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : post.images.length === 2 ? (
          <div className="grid grid-cols-2 gap-0.5">
            {post.images.slice(0, 2).map((src, i) => (
              <div key={i} className="aspect-square">
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : post.images.length >= 3 ? (
          <div className="grid grid-cols-2 gap-0.5">
            <div className="row-span-2 aspect-square overflow-hidden">
              <img
                src={post.images[0]}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            {post.images.slice(1, 3).map((src, i) => (
              <div key={i} className="aspect-square">
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-3 pt-4">
        {text ? (
          <p className={`whitespace-pre-line text-sm leading-relaxed text-ink-700 ${single ? '' : 'line-clamp-5'}`}>
            {text}
          </p>
        ) : (
          <p className="text-sm text-ink-400 italic">
            {rtl ? 'منشور من BM Store' : 'A new update from BM Store'}
          </p>
        )}

        {/* Featured product */}
        <Link
          to={`/product/${post.product.slug}`}
          className="mt-4 flex items-center gap-3.5 rounded-xl border border-line bg-canvas p-3 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50/60"
        >
          <img
            src={post.product.image}
            alt={productName}
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{t('posts.featuredProduct')}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-ink-900">{productName}</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-sm font-bold text-brand-700">
                {post.product.price.toLocaleString()} <span className="text-[11px] font-semibold">DA</span>
              </span>
              {post.product.isSpecialOffer && post.product.oldPrice && post.product.oldPrice > post.product.price && (
                <span className="text-xs text-ink-400 line-through">{post.product.oldPrice.toLocaleString()} DA</span>
              )}
            </div>
          </div>
          <span
            className={`hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 transition-transform duration-300 group-hover:translate-x-0.5 sm:inline-flex ${
              rtl ? 'group-hover:-translate-x-0.5' : ''
            }`}
          >
            {t('posts.viewProduct')}
            <ArrowIcon size={15} />
          </span>
        </Link>
      </div>

      {/* Counts */}
      {totalEngagement > 0 && (
        <div className="flex items-center justify-end gap-4 px-5 pb-2">
          {likesCount > 0 && (
            <span className="text-xs font-medium text-ink-500">{t('posts.likesCount', { count: likesCount })}</span>
          )}
          {commentsCount > 0 && (
            <span className="text-xs font-medium text-ink-500">{t('posts.commentsCount', { count: commentsCount })}</span>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="mt-1 flex items-center justify-around border-t border-line px-2 py-1">
        <button
          type="button"
          onClick={() => void handleLike()}
          disabled={likeBusy}
          aria-pressed={liked}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            liked ? 'text-danger-500' : 'text-ink-600 hover:bg-ink-900/5'
          }`}
        >
          {likeBusy ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          )}
          {liked ? t('posts.liked') : t('posts.like')}
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          aria-expanded={commentsOpen}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            commentsOpen ? 'text-brand-600' : 'text-ink-600 hover:bg-ink-900/5'
          }`}
        >
          <MessageCircle size={17} />
          {commentLabel(commentsCount, single, commentsOpen, t('posts.comments'), t('posts.viewComments'))}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-900/5"
        >
          <Share2 size={17} />
          {t('posts.share')}
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="border-t border-line bg-canvas/40 px-5 py-4">
          <CommentsSection postId={post.id} onCountChange={setCommentsCount} />
        </div>
      )}

      <ShareModal
        open={shareOpen}
        url={`${window.location.origin}/posts/${post.id}`}
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