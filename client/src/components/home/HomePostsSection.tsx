import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Play, MessageSquare } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import { loadHomePosts } from '../../services/catalog'
import SectionHeader from '../common/SectionHeader'
import { ProductCardSkeleton } from '../common/Skeletons'
import type { PostItem } from '../../services/catalog'

function PostMiniCard({ post }: { post: PostItem }) {
  const { lang } = useLanguage()
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight
  const text = lang === 'ar' ? (post.textAr || post.textEn) : (post.textEn || post.textAr)
  const productName = lang === 'ar' ? (post.product.nameAr || post.product.name) : post.product.name

  return (
    <Link
      to={`/product/${post.product.slug}`}
      className="group overflow-hidden rounded-2xl border border-line bg-surface transition-all hover:border-brand-200 hover:shadow-md"
    >
      {/* Media */}
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-900/5">
        {post.mediaType === 'video' && post.video ? (
          <>
            <video src={post.video} className="h-full w-full object-cover" preload="metadata" playsInline />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-lg">
                <Play size={18} fill="currentColor" />
              </span>
            </div>
          </>
        ) : post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MessageSquare size={28} className="text-ink-300" />
          </div>
        )}
      </div>

      {/* Text */}
      {text && (
        <div className="px-4 pt-3">
          <p className="line-clamp-2 text-sm leading-snug text-ink-700">{text}</p>
        </div>
      )}

      {/* Product */}
      <div className="flex items-center gap-3 p-4 pt-2">
        <img src={post.product.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-ink-900">{productName}</p>
          <p className="text-xs font-bold text-brand-700">{post.product.price.toLocaleString()} DA</p>
        </div>
        <ArrowIcon size={14} className="shrink-0 text-brand-600 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  )
}

export default function HomePostsSection() {
  const { t, lang } = useLanguage()
  const { data: posts, loading, error } = useAsync(() => loadHomePosts())

  if (loading) {
    return (
      <section className="mt-11 sm:mt-14" aria-label={t('home.latestPosts')}>
        <SectionHeader title={t('home.latestPosts')} subtitle={t('home.latestPostsSub')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (error || !posts || posts.length === 0) return null

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight

  return (
    <section className="mt-11 sm:mt-14" aria-label={t('home.latestPosts')}>
      <SectionHeader
        title={t('home.latestPosts')}
        subtitle={t('home.latestPostsSub')}
        action={
          <Link
            to="/posts"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {t('common.viewAll')}
            <ArrowIcon size={16} />
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
        {posts.slice(0, 6).map((post) => (
          <PostMiniCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}
