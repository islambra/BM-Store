import { useState } from 'react'
import { MessageSquare, Newspaper, ArrowDown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import { loadPostsPage } from '../services/catalog'
import type { PostItem } from '../services/catalog'
import PostCard from '../components/post/PostCard'
import EmptyState from '../components/common/EmptyState'

export default function PostsPage() {
  const { t, lang } = useLanguage()
  const rtl = lang === 'ar'
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<PostItem[]>([])
  const { data, loading, error } = useAsync(() => loadPostsPage(1))

  const currentPosts = posts.length > 0 ? posts : (data?.posts ?? [])
  const pages = data?.pages ?? 1
  const total = data?.total ?? 0
  const hasMore = posts.length > 0 ? posts.length < total : page < pages

  const loadMore = async () => {
    const next = page + 1
    const res = await loadPostsPage(next)
    setPosts((prev) => {
      const existing = prev.length > 0 ? prev : (data?.posts ?? [])
      const seen = new Set(existing.map((p) => p.id))
      return [...existing, ...res.posts.filter((p) => !seen.has(p.id))]
    })
    setPage(next)
  }

  return (
    <div className="container-app py-6 sm:py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-12 text-white sm:px-10 sm:py-16">
        <div
          className={`pointer-events-none absolute -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl ${
            rtl ? '-left-16' : '-right-16'
          }`}
        />
        <div
          className={`pointer-events-none absolute -bottom-20 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl ${
            rtl ? '-right-20' : '-left-20'
          }`}
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            <Newspaper size={14} />
            {rtl ? 'المدونة والمنشورات' : 'Blog & Updates'}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t('posts.title')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">{t('posts.subtitle')}</p>
          {total > 0 && !loading && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
              {total} {rtl ? 'منشور' : 'posts'}
            </p>
          )}
        </div>
      </section>

      {/* Loading */}
      {loading && posts.length === 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="aspect-video bg-ink-900/5" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-1/3 rounded bg-ink-900/5" />
                <div className="h-4 w-5/6 rounded bg-ink-900/5" />
                <div className="h-3 w-3/4 rounded bg-ink-900/5" />
                <div className="h-14 rounded-xl bg-ink-900/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-danger-100 bg-danger-50 p-6 text-center">
          <p className="text-sm font-medium text-danger-600">{error}</p>
        </div>
      ) : currentPosts.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={MessageSquare} title={t('posts.empty')} />
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {currentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Load more */}
          <div className="mt-10 flex flex-col items-center gap-3">
            {hasMore ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                className="btn-secondary inline-flex items-center gap-2 px-6"
              >
                <ArrowDown size={16} />
                {t('posts.loadMore')}
              </button>
            ) : (
              <span className="text-sm font-medium text-ink-400">{t('posts.noMore')}</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}