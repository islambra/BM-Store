import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquare, ArrowDown, Loader2, AlertCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAsync } from '../hooks/useAsync'
import { loadPostsPage } from '../services/catalog'
import { getErrorMessage } from '../services/api'
import type { PostItem } from '../services/catalog'
import PostCard from '../components/post/PostCard'
import EmptyState from '../components/common/EmptyState'

export default function PostsPage() {
  const { t } = useLanguage()
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const { data, loading, error } = useAsync(() => loadPostsPage(1))
  const { hash } = useLocation()

  const currentPosts = posts.length > 0 ? posts : (data?.posts ?? [])
  const total = data?.total ?? 0
  const hasMore = currentPosts.length < total

  // Deep link from homepage cards (`/posts#post-<id>`): scroll to the post
  // once the feed has loaded. Runs after ScrollToTop so it wins.
  useEffect(() => {
    if (!hash || currentPosts.length === 0) return
    const el = document.getElementById(hash.slice(1))
    if (!el) return
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => clearTimeout(t)
  }, [hash, currentPosts.length])

  const loadMore = async () => {
    setLoadingMore(true)
    setLoadMoreError('')
    try {
      const next = page + 1
      const res = await loadPostsPage(next)
      setPosts((prev) => {
        const existing = prev.length > 0 ? prev : (data?.posts ?? [])
        const seen = new Set(existing.map((p) => p.id))
        return [...existing, ...res.posts.filter((p) => !seen.has(p.id))]
      })
      setPage(next)
    } catch (err) {
      setLoadMoreError(getErrorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="container-app py-6 sm:py-10" role="feed" aria-label={t('posts.title')}>
      {/* Loading */}
      {loading && currentPosts.length === 0 ? (
        <div className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-4xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface p-4 lg:p-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-ink-900/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-ink-900/5" />
                  <div className="h-2.5 w-1/5 rounded bg-ink-900/5" />
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row">
                <div className="h-60 rounded-xl bg-ink-900/5 sm:h-72 lg:h-[272px] lg:w-[42%] lg:shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-5/6 rounded bg-ink-900/5" />
                  <div className="h-3 w-3/4 rounded bg-ink-900/5" />
                  <div className="h-16 rounded-xl bg-ink-900/5" />
                  <div className="h-10 rounded-xl bg-ink-900/5" />
                </div>
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
          {/* Feed — centered, compact cards (wider on desktop for horizontal layout) */}
          <div className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-4xl lg:space-y-6">
            {currentPosts.map((post) => (
              <div key={post.id} id={`post-${post.id}`} className="scroll-mt-24">
                <PostCard post={post} />
              </div>
            ))}
          </div>

          {/* Load more */}
          <div className="mt-10 flex flex-col items-center gap-3">
            {loadMoreError && (
              <p className="inline-flex items-center gap-2 text-sm text-danger-600">
                <AlertCircle size={15} />
                {loadMoreError}
              </p>
            )}
            {hasMore ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="btn-secondary inline-flex items-center gap-2 px-6"
              >
                {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ArrowDown size={16} />}
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