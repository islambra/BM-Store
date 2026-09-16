import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Pencil, Eye, EyeOff, LoaderCircle, Search, ImagePlus, Video, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Field, Textarea } from '../common/FormControls'
import ConfirmDialog from '../common/ConfirmDialog'
import { ErrorNote, Loader } from './adminShared'
import type { PostRecord, ProductRecord } from '../../services/api'

export default function PostsSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminPosts())
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PostRecord | null>(null)
  const [notice, setNotice] = useState('')

  const openCreate = () => {
    setEditingPost(null)
    setModal('create')
  }

  const openEdit = (post: PostRecord) => {
    setEditingPost(post)
    setModal('edit')
  }

  const close = () => {
    setModal(null)
    setEditingPost(null)
  }

  const del = async (id: string) => {
    try {
      await api.deletePost(id)
      setDeleteTarget(null)
      setNotice(t('admin.post.deleted'))
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  const togglePublish = async (post: PostRecord) => {
    try {
      await api.publishPost(post._id)
      void reload()
    } catch (err) {
      setNotice(getErrorMessage(err))
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const posts = data?.posts ?? []

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">
          {t('admin.tabs.posts')} ({posts.length})
        </h3>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          {t('admin.post.create')}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface py-16 text-center">
          <p className="text-sm font-semibold text-ink-700">{t('admin.post.noPosts')}</p>
          <p className="mt-1 text-xs text-ink-400">{t('admin.post.noPostsDesc')}</p>
          <button type="button" onClick={openCreate} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus size={16} />
            {t('admin.post.create')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const title = lang === 'ar' ? (post.textAr || post.textEn || '—') : (post.textEn || post.textAr || '—')
            const isPublished = post.status === 'published'
            return (
              <article
                key={post._id}
                className="group overflow-hidden rounded-2xl border border-line bg-surface transition-[border-color,box-shadow] hover:border-ink-900/20 hover:shadow-soft"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-canvas">
                  {post.mediaType === 'video' && post.video ? (
                    <div className="relative h-full w-full">
                      <video src={post.video} className="h-full w-full object-cover" />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-900/25">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md">
                          <Video size={18} />
                        </span>
                      </span>
                    </div>
                  ) : post.images.length > 0 ? (
                    <img
                      src={post.images[0]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-ink-900/5">
                      <ImagePlus size={28} className="text-ink-300" />
                    </div>
                  )}

                  <span
                    className={`absolute start-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur ${
                      isPublished ? 'text-success-700' : 'text-ink-600'
                    }`}
                  >
                    {post.mediaType === 'video' ? <Video size={12} /> : <ImagePlus size={12} />}
                    {isPublished ? t('admin.post.published') : t('admin.post.draft')}
                  </span>
                  {post.images.length > 1 && (
                    <span className="absolute end-2.5 top-2.5 rounded-md bg-ink-900/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      +{post.images.length - 1}
                    </span>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900">
                      {title}
                    </p>
                    <p className="mt-1 truncate text-xs text-ink-400">
                      {post.productId?.name ?? t('admin.post.noProduct')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="text-xs text-ink-400">
                      {new Date(post.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en')}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void togglePublish(post)}
                        className="icon-btn hover:bg-success-50 text-brand-600"
                        title={isPublished ? t('admin.post.unpublish') : t('admin.post.publish')}
                      >
                        {isPublished ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                      <button type="button" onClick={() => openEdit(post)} className="icon-btn hover:bg-ink-900/5 text-ink-500">
                        <Pencil size={17} />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(post)} className="icon-btn hover:bg-danger-50 text-red-600">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {modal && (
        <PostFormModal
          mode={modal}
          post={editingPost}
          onClose={close}
          onSaved={() => { close(); void reload() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('admin.post.deleteTitle')}
        description={t('admin.post.deleteDesc')}
        confirmLabel={t('common.remove')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => deleteTarget && void del(deleteTarget._id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Post Form Modal                                                     */
/* ------------------------------------------------------------------ */

function PostFormModal({
  mode,
  post,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  post: PostRecord | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLanguage()
  const [textAr, setTextAr] = useState(post?.textAr ?? '')
  const [mediaType, setMediaType] = useState<'images' | 'video'>(post?.mediaType ?? 'images')
  const [images, setImages] = useState<string[]>(post?.images ?? [])
  const [video, setVideo] = useState(post?.video ?? '')
  const [productId, setProductId] = useState(post?.productId?._id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const save = async () => {
    if (mediaType === 'video' && !video) { setError(t('admin.post.videoRequired')); return }
    setBusy(true)
    setError('')
    try {
      const body: api.CreatePostInput = {
        textAr: textAr || undefined,
        mediaType,
        images: mediaType === 'images' ? images : [],
        video: mediaType === 'video' ? video : undefined,
        productId: productId || undefined,
      }
      if (mode === 'edit' && post) {
        await api.updatePost(post._id, body)
      } else {
        await api.createPost({ ...body, status: 'published' })
      }
      setNotice(t('admin.post.saved'))
      setTimeout(onSaved, 800)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh] sm:px-6 sm:pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-5vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl animate-in zoom-in-95 sm:max-h-[calc(100dvh-8vh-3rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <h3 className="text-lg font-bold text-ink-900">
            {mode === 'create' ? t('admin.post.create') : t('admin.post.edit')}
          </h3>
          <button type="button" onClick={onClose} className="icon-btn text-ink-400">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {error && <p role="alert" className="rounded-xl bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">{error}</p>}
          {notice && <p className="rounded-xl bg-success-50 px-3 py-2 text-sm font-medium text-success-600">{notice}</p>}

          <Field label={t('admin.post.textAr')} required>
            <Textarea value={textAr} onChange={(e) => setTextAr(e.target.value)} rows={3} placeholder={t('admin.post.textArPh')} className="text-end" dir="rtl" />
          </Field>

          <Field label={t('admin.post.mediaType')}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMediaType('images')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mediaType === 'images' ? 'bg-brand-600 text-white shadow-sm' : 'bg-ink-900/5 text-ink-600 hover:bg-ink-900/10'
                }`}
              >
                <ImagePlus size={16} />
                {t('admin.post.images')}
              </button>
              <button
                type="button"
                onClick={() => setMediaType('video')}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mediaType === 'video' ? 'bg-brand-600 text-white shadow-sm' : 'bg-ink-900/5 text-ink-600 hover:bg-ink-900/10'
                }`}
              >
                <Video size={16} />
                {t('admin.post.video')}
              </button>
            </div>
          </Field>

          {mediaType === 'images' ? (
            <ImageUploadField images={images} onChange={setImages} />
          ) : (
            <VideoUploadField video={video} onChange={setVideo} />
          )}

          <ProductSelectField initialProduct={post?.productId ?? null} onChange={setProductId} />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line bg-surface px-5 py-4 sm:px-6">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={() => void save()} disabled={busy} className="btn-primary inline-flex items-center gap-2">
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Image Upload Field                                                  */
/* ------------------------------------------------------------------ */

function ImageUploadField({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const atMax = images.length >= 5

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await api.uploadImage(file)
      onChange([...images, url])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2.5">
        {images.map((src, i) => (
          <div key={src + i} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-line">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-ink-900/60 text-white opacity-0 transition-opacity hover:bg-danger-600 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {!atMax && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-line-strong text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
          >
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      {error && <p role="alert" className="text-xs font-medium text-danger-600">{error}</p>}
      <p className="text-xs text-ink-400">{images.length}/5</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Video Upload Field                                                  */
/* ------------------------------------------------------------------ */

function VideoUploadField({ video, onChange }: { video: string; onChange: (v: string) => void }) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await api.uploadVideo(file)
      onChange(url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {video ? (
        <div className="relative overflow-hidden rounded-xl border border-line">
          <video src={video} controls className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900/60 text-white hover:bg-danger-600"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-20 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Video size={18} />}
          <span className="text-sm font-semibold">{t('admin.post.video')}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      {error && <p role="alert" className="text-xs font-medium text-danger-600">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Product Select Field                                                */
/* ------------------------------------------------------------------ */

interface SelectedProduct {
  _id: string
  name: string
  image?: string
  price?: number
}

function ProductSelectField({
  initialProduct,
  onChange,
}: {
  initialProduct?: SelectedProduct | null
  onChange: (v: string) => void
}) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductRecord[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedProduct | null>(initialProduct ?? null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const ticketRef = useRef(0)

  const load = async (q: string) => {
    const ticket = ++ticketRef.current
    setSearching(true)
    try {
      const res = await api.listProducts(q ? { q, limit: 8 } : { limit: 20 })
      if (ticket === ticketRef.current) setResults(res.products ?? [])
    } catch { /* ignore */ }
    if (ticket === ticketRef.current) setSearching(false)
  }

  useEffect(() => {
    if (!open) return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { void load(''); return }
    timerRef.current = setTimeout(() => void load(query), 300)
    return () => clearTimeout(timerRef.current)
  }, [query, open])

  const pick = (p: ProductRecord) => {
    setSelected({ _id: p._id, name: p.name, image: p.image, price: p.price })
    setQuery(p.name)
    setOpen(false)
    setResults([])
    onChange(p._id)
  }

  return (
    <div className="space-y-2">
      <Field label={t('admin.post.selectProduct')}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={t('admin.post.searchProduct')}
            className="input ps-10"
          />
        </div>
      </Field>

      <button
        type="button"
        onClick={() => { setSelected(null); setQuery(''); setOpen(false); onChange('') }}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
          selected === null && !query.trim()
            ? 'border-brand-600 bg-brand-50 text-brand-700'
            : 'border-line text-ink-500 hover:border-brand-300 hover:text-brand-700'
        }`}
      >
        <X size={14} />
        {t('admin.post.noProductOption')}
      </button>

      {selected && !open && !query.trim() && (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
          {selected.image && (
            <img src={selected.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{selected.name}</p>
            {selected.price !== undefined && (
              <p className="text-xs text-ink-500">{selected.price.toLocaleString()} DA</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery(''); onChange('') }}
            className="icon-btn text-ink-400"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {open && (
        <div className="max-h-60 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg">
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <LoaderCircle size={20} className="animate-spin text-brand-600" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">{t('common.noResults')}</p>
          ) : (
            results.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => pick(p)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-canvas"
              >
                <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-500">{p.price.toLocaleString()} DA</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
