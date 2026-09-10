import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ArrowLeft, FileX2, Loader2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import { loadPost } from '../services/catalog'
import PostCard from '../components/post/PostCard'

export default function SinglePostPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useLanguage()
  const rtl = lang === 'ar'
  const BackIcon = rtl ? ArrowRight : ArrowLeft
  const { data: post, loading, error } = useAsync(() => (id ? loadPost(id) : Promise.resolve(null)))

  return (
    <div className="container-app py-6 sm:py-10">
      <Link
        to="/posts"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-brand-700"
      >
        <BackIcon size={15} />
        {t('posts.allPosts')}
      </Link>

      <div className="mx-auto w-full max-w-2xl">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={26} className="animate-spin text-ink-300" />
          </div>
        ) : error || !post ? (
          <div className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-14 text-center">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <FileX2 size={30} />
            </span>
            <h2 className="text-lg font-bold text-ink-900">{t('posts.notFound')}</h2>
            <p className="mt-1.5 text-sm text-ink-500">{t('posts.notFoundDesc')}</p>
            <Link to="/posts" className="btn-primary mt-6">
              {t('posts.allPosts')}
            </Link>
          </div>
        ) : (
          <PostCard post={post} single />
        )}
      </div>
    </div>
  )
}