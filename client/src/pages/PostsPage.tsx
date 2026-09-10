import { useState } from 'react'
import { MessageSquare, ArrowDown, Loader2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import { loadPostsPage } from '../services/catalog'
import type { PostItem } from '../services/catalog'
import PostCard from '../components/post/PostCard'
import EmptyState from '../components/common/EmptyState'

export default function PostsPage() {
  const { t } = useLanguage()
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<PostItem[]>([])
  const { data, loading, error } = useAsync(() => loadPostsPage(1))

  const currentPosts = posts.length > 0 ? posts : (data?.posts ?? [])
  const total = data?.total ?? 0
  const hasMore = currentPosts.length < total

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
    <div className="container-app py-6 sm:py-10" role="feed" aria-label={t('posts.title')}>
      {/* Loading */}
      {loading && currentPosts.length === 0 ? (
        <div className="mx-auto w-full max-w-2xl space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="h-10 w-10 rounded-full bg-ink-900/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-ink-900/5" />
                  <div className="h-2.5 w-1/5 rounded bg-ink-900/5" />
                </div>
              </div>
              <div className="aspect-video bg-ink-900/5" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-5/6 rounded bg-ink-900/5" />
                <div className="h-3 w-3/4 rounded bg-ink-900/5" />
                <div className="h-14 rounded-xl bg-ink-900/5" />
                <div className="h-10 rounded-xl bg-ink-900/5" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger-100 bg-danger-50 p-6 text-center">
          <p className="text-sm font-medium text-danger-600">{error}</p>
        </div>
      ) : currentPosts.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('posts.empty')} />
      ) : (
        <>
          {/* Feed */}
          <div className="mx-auto w-full max-w-2xl space-y-6">
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
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400">
                <Loader2 size={13} className="opacity-50" />
                {t('posts.noMore')}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}