import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { getErrorMessage, uploadImage } from '../../services/api'

interface ImageUploaderProps {
  label?: string
  multiple?: boolean
  max?: number
  value: string | string[]
  onChange: (v: string | string[]) => void
  accept?: string
}

export default function ImageUploader({ label, multiple = false, max, value, onChange, accept }: ImageUploaderProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const list: string[] = Array.isArray(value) ? value : value ? [value] : []
  const atMax = max !== undefined && list.length >= max

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await uploadImage(file)
      if (multiple) {
        onChange([...list.filter(Boolean), url])
      } else {
        onChange(url)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeAt = (index: number) => {
    const next = list.filter((_, i) => i !== index)
    if (multiple) {
      onChange(next)
    } else {
      onChange('')
    }
  }

  const thumb = (src: string, index: number, removeable = true) => (
    <div key={src + index} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-line">
      <img src={src} alt={`${label ?? t('common.uploadImage')} ${index + 1}`} className="h-full w-full object-cover" />
      {removeable && (
        <button
          type="button"
          onClick={() => removeAt(index)}
          aria-label={t('common.remove')}
          className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-ink-900/60 text-white opacity-0 transition-opacity hover:bg-danger-600 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )

  const addTile = (compact = false) => (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={busy || atMax}
      title={label ?? t('common.uploadImage')}
      className={`flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong text-ink-400 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? 'h-12 px-4 text-sm font-semibold' : 'h-24 w-24'
      }`}
    >
      {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
      {compact && <span>{label ?? t('common.uploadImage')}</span>}
    </button>
  )

  return (
    <div className="space-y-1.5">
      {multiple ? (
        <div className="flex flex-wrap gap-2.5">
          {list.map((src, i) => thumb(src, i))}
          {!atMax && addTile(false)}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5">
          {list[0] ? (
            <>
              {thumb(list[0], 0)}
              {!atMax && addTile(true)}
            </>
          ) : (
            addTile(true)
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept || "image/*"}
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {error && <p role="alert" className="text-xs font-medium text-danger-600">{error}</p>}
    </div>
  )
}