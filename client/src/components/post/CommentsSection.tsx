import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, MessageCircle, Pencil, Send, Trash2, X, Check } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/api'
import type { CommentRecord } from '../../services/api'
import ConfirmDialog from '../common/ConfirmDialog'

const PAGE_SIZE = 8

function AvatarBadge({ name, avatar, size = 'h-9 w-9 text-xs' }: { name: string; avatar?: string | null; size?: string }) {
  if (avatar) {
    return <img src={avatar} alt="" className={`${size} shrink-0 rounded-full object-cover`} loading="lazy" />
  }
  const initial = name?.trim().charAt(0)?.toUpperCase() || '؟'
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white`}
    >
      {initial}
    </span>
  )
}

function formatDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(
      new Date(iso),
    )
  } catch {
    return ''
  }
}

export default function CommentsSection({
  postId,
  onCountChange,
}: {
  postId: string
  onCountChange: (n: number) => void
}) {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [comments, setComments] = useState<CommentRecord[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CommentRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (targetPage === 1) setLoading(true)
      else setLoadingMore(true)
      setError(null)
      try {
        const res = await api.getComments(postId, { page: targetPage, limit: PAGE_SIZE })
        if (replace) {
          setComments((prev) => {
            const seen = new Set(res.comments.map((c) => c._id))
            return [...prev.filter((c) => !seen.has(c._id)), ...res.comments]
          })
        } else {
          setComments((prev) => {
            const seen = new Set(prev.map((c) => c._id))
            return [...prev, ...res.comments.filter((c) => !seen.has(c._id))]
          })
        }
        setTotal(res.total)
        setPages(res.pages)
        setPage(res.page)
        onCountChange(res.total)
      } catch (e) {
        setError(e instanceof Error ? e.message : '')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [postId, onCountChange],
  )

  useEffect(() => {
    void load(1, true)
  }, [load])

  const goToLogin = () => navigate('/login', { state: { from: location.pathname } })

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      const created = await api.createComment(postId, text)
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c._id))
        return seen.has(created._id) ? prev : [created, ...prev]
      })
      setTotal((n) => n + 1)
      setDraft('')
      onCountChange(total + 1)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '')
    } finally {
      setSending(false)
    }
  }

  const startEdit = (c: CommentRecord) => {
    setEditingId(c._id)
    setEditingText(c.text)
  }

  const saveEdit = async (c: CommentRecord) => {
    const text = editingText.trim()
    if (!text || savingEdit) return
    setSavingEdit(true)
    setError(null)
    try {
      const updated = await api.updateComment(c._id, text)
      setComments((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))
      setEditingId(null)
      setEditingText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '')
    } finally {
      setSavingEdit(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await api.deleteComment(deleteTarget._id)
      setComments((prev) => prev.filter((x) => x._id !== deleteTarget._id))
      setTotal((n) => Math.max(0, n - 1))
      onCountChange(Math.max(0, total - 1))
      setDeleteTarget(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const loadMore = () => {
    if (page < pages && !loadingMore) void load(page + 1, false)
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-medium text-danger-600">{error}</p>
      )}

      {/* Composer */}
      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
          className="flex items-center gap-2.5"
        >
          <AvatarBadge name={user.name} avatar={user.avatar} />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('posts.writeComment')}
            aria-label={t('posts.writeComment')}
            className="h-10 flex-1 rounded-full border border-line bg-canvas px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label={t('posts.send')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="rtl:-scale-x-100" />}
          </button>
        </form>
      ) : (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-line bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">{t('posts.loginToComment')}</p>
          <button
            type="button"
            onClick={goToLogin}
            className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {t('posts.login')}
          </button>
        </div>
      )}

      {/* List */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-canvas py-6 text-ink-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-canvas px-4 py-8 text-center">
            <MessageCircle size={22} className="text-ink-300" />
            <p className="mt-2 text-sm font-semibold text-ink-700">{t('posts.noComments')}</p>
            <p className="text-xs text-ink-400">{t('posts.beFirstComment')}</p>
          </div>
        ) : (
          comments.map((c) => {
            const isOwner = !!user && c.authorId === user.id
            const canDelete = isOwner || user?.role === 'ADMIN'
            const editing = editingId === c._id
            return (
              <div key={c._id} className="flex gap-2.5">
                {c.author ? (
                  <AvatarBadge name={c.author.name} avatar={c.author.avatar} />
                ) : (
                  <AvatarBadge name="" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="rounded-2xl rounded-ss-sm border border-line bg-surface px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs font-bold text-ink-900">
                          {c.author?.name ?? t('posts.login')}
                        </span>
                        <span className="shrink-0 text-[10px] text-ink-400">
                          {formatDate(c.createdAt, lang === 'ar' ? 'ar-DZ' : 'en-US')}
                        </span>
                      </div>
                      <span className="flex shrink-0 items-center gap-0.5">
                        {isOwner && !editing && (
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            aria-label={t('posts.edit')}
                            className="icon-btn h-7 w-7 text-ink-400"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(c)}
                            aria-label={t('posts.delete')}
                            className="icon-btn h-7 w-7 text-ink-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </span>
                    </div>
                    {editing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          void saveEdit(c)
                        }}
                        className="mt-2 flex items-center gap-2"
                      >
                        <input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                        />
                        <button
                          type="submit"
                          disabled={!editingText.trim() || savingEdit}
                          aria-label={t('posts.send')}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-40"
                        >
                          {savingEdit ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditingText('')
                          }}
                          aria-label="Cancel"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-500"
                        >
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink-700">{c.text}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {loadingMore && (
          <div className="flex justify-center pt-1">
            <Loader2 size={18} className="animate-spin text-ink-400" />
          </div>
        )}

        {!loading && page < pages && (
          <div className="flex justify-center pt-1">
            <button type="button" onClick={loadMore} disabled={loadingMore} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              {t('posts.loadComments')}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('posts.deleteCommentTitle')}
        description={t('posts.deleteCommentDesc')}
        confirmLabel={t('posts.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}