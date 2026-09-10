import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Calendar, Play } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import type { PostItem } from '../../services/catalog'

export default function PostCard({ post }: { post: PostItem }) {
  const { lang } = useLanguage()
  const rtl = lang === 'ar'
  const ArrowIcon = rtl ? ArrowLeft : ArrowRight
  const text = rtl ? (post.textAr || post.textEn) : (post.textEn || post.textAr)
  const productName = rtl ? (post.product.nameAr || post.product.name) : post.product.name
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

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

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
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

        <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          <Calendar size={12} />
          {date}
        </span>
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-col px-5 pb-4 pt-4">
        {text && (
          <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-line line-clamp-5">{text}</p>
        )}

        {!text && (
          <p className="text-sm text-ink-400 italic">
            {rtl ? 'غيّر صوتك — أول تعليق لك!' : 'Say it first — be the first on this post!'}
          </p>
        )}

        {/* Product preview */}
        <Link
          to={`/product/${post.product.slug}`}
          className="mt-4 flex items-center gap-3.5 rounded-xl border border-line bg-canvas p-3 transition-all duration-300 group-hover:border-brand-300 group-hover:bg-brand-50/60"
        >
          <img
            src={post.product.image}
            alt={productName}
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{productName}</p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-sm font-bold text-brand-700">
                {post.product.price.toLocaleString()} <span className="text-[11px] font-semibold">DA</span>
              </span>
              {post.product.isSpecialOffer && post.product.oldPrice && post.product.oldPrice > post.product.price && (
                <span className="text-xs text-ink-400 line-through">
                  {post.product.oldPrice.toLocaleString()} DA
                </span>
              )}
            </div>
          </div>
          <span
            className={`hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 transition-transform duration-300 group-hover:translate-x-0.5 sm:inline-flex ${
              rtl ? 'group-hover:-translate-x-0.5' : ''
            }`}
          >
            {rtl ? 'عرض المنتج' : 'View Product'}
            <ArrowIcon size={15} />
          </span>
        </Link>
      </div>
    </article>
  )
}