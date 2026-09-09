import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, ChevronDown } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Field wrapper — always-labelled, with hint and error support        */
/* ------------------------------------------------------------------ */

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id?: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="text-danger-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Input / Textarea / Select                                           */
/* ------------------------------------------------------------------ */

export interface TextControlProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon | null
  state?: 'default' | 'error'
  invalid?: boolean
  trailing?: ReactNode
}

export function Input({ icon: Icon, state = 'default', invalid, className = '', trailing, ...rest }: TextControlProps) {
  const iconCls = invalid || state === 'error' ? 'text-danger-500' : 'text-ink-400'
  return (
    <div className="relative">
      {Icon && <Icon size={17} className={`pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 ${iconCls}`} />}
      <input className={`input ${Icon ? 'ps-11' : ''} ${trailing ? 'pe-12' : ''} ${invalid || state === 'error' ? 'input-error' : ''} ${className}`} {...rest} />
      {trailing}
    </div>
  )
}

export interface TextareaControlProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  icon?: LucideIcon | null
  invalid?: boolean
}

export function Textarea({ icon: Icon, invalid, className = '', ...rest }: TextareaControlProps) {
  return (
    <div className="relative">
      {Icon && <Icon size={17} className="pointer-events-none absolute start-3.5 top-4 text-ink-400" />}
      <textarea className={`input resize-y ${Icon ? 'ps-11' : ''} ${invalid ? 'input-error' : ''} ${className}`} {...rest} />
    </div>
  )
}

export interface SelectControlProps extends SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon | null
  invalid?: boolean
  options?: { value: string; label: string }[]
}

export function Select({ icon: Icon, invalid, children, className = '', options, ...rest }: SelectControlProps) {
  return (
    <div className="relative">
      {Icon && <Icon size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-400" />}
      <select className={`input appearance-none ${Icon ? 'ps-11' : ''} pe-11 ${invalid ? 'input-error' : ''} ${className}`} {...rest}>
        {options ? (
          options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        ) : (
          children
        )}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toggle switch                                                       */
/* ------------------------------------------------------------------ */

export function Toggle({
  checked,
  onChange,
  label,
  id,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  id?: string
  disabled?: boolean
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? 'bg-brand-600' : 'bg-ink-900/15'
      }`}
    >
      <span
        className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-all ${
          checked ? 'start-5.5' : 'start-0.5'
        }`}
      >
        {checked && <Check size={11} className="text-brand-700" strokeWidth={3} />}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */

export function Alert({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  children: ReactNode
  className?: string
}) {
  const cls =
    tone === 'success'
      ? 'border-success-100 bg-success-50 text-success-700'
      : tone === 'warning'
        ? 'border-warning-100 bg-warning-50 text-warning-700'
        : tone === 'danger'
          ? 'border-danger-100 bg-danger-50 text-danger-700'
          : 'border-brand-100 bg-brand-50 text-brand-700'
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={`rounded-xl border px-4 py-3 text-sm font-medium ${cls} ${className}`}>
      {children}
    </div>
  )
}