import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import { loadHomePosts } from '../../services/catalog'
import SectionHeader from '../common/SectionHeader'
import { ProductCardSkeleton } from '../common/Skeletons'
import PostPreviewCard from '../post/PostPreviewCard'

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {posts.slice(0, 6).map((post) => (
          <PostPreviewCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}
