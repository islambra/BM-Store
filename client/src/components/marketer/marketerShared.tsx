import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await copyText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button type="button" onClick={() => void copy()} className="btn-primary btn-sm shrink-0">
      {copied ? <Check size={14} className="text-success-500" /> : <Copy size={14} />}
      {copied ? copiedLabel : label}
    </button>
  )
}

export function MarketerStatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-brand-600/20 bg-brand-600 text-white' : 'border-line bg-surface'}`}>
      <Icon size={18} className={accent ? 'text-white/80' : 'text-brand-600'} />
      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${accent ? 'text-white' : 'text-ink-900'}`}>{value}</p>
      <p className={`mt-0.5 text-xs ${accent ? 'text-white/80' : 'text-ink-500'}`}>{label}</p>
      {hint && <p className={`mt-1 text-[11px] ${accent ? 'text-white/60' : 'text-ink-400'}`}>{hint}</p>}
    </div>
  )
}

export const commissionStatusKey: Record<string, string> = {
  PENDING: 'marketer.commissionPending',
  AVAILABLE: 'marketer.statusAvailable',
  PAYOUT_REQUESTED: 'marketer.statusPaymentRequested',
  PAYMENT_SENT: 'marketer.statusPaymentSent',
  RECEIVED: 'marketer.statusReceived',
  DISPUTED: 'marketer.statusDisputed',
  CANCELLED: 'marketer.commissionCancelled',
}

const commissionTone: Record<string, string> = {
  PENDING: 'bg-warning-50 text-warning-700 ring-warning-100',
  AVAILABLE: 'bg-success-50 text-success-700 ring-success-100',
  PAYOUT_REQUESTED: 'bg-brand-50 text-brand-700 ring-brand-100',
  PAYMENT_SENT: 'bg-brand-100 text-brand-800 ring-brand-200',
  RECEIVED: 'bg-success-100 text-success-800 ring-success-200',
  DISPUTED: 'bg-danger-50 text-danger-700 ring-danger-100',
  CANCELLED: 'bg-ink-900/5 text-ink-500 ring-ink-900/5',
}

export function CommissionStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${commissionTone[status] ?? commissionTone.PENDING}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(commissionStatusKey[status] ?? 'marketer.commissionPending')}
    </span>
  )
}

export const payoutStatusKey: Record<string, string> = {
  sent: 'marketer.statusPaymentSent',
  received: 'marketer.statusReceived',
  disputed: 'marketer.statusDisputed',
  cancelled: 'marketer.statusCancelled',
}

const payoutTone: Record<string, string> = {
  sent: 'bg-brand-100 text-brand-800 ring-brand-200',
  received: 'bg-success-50 text-success-700 ring-success-100',
  disputed: 'bg-danger-50 text-danger-700 ring-danger-100',
  cancelled: 'bg-ink-900/5 text-ink-500 ring-ink-900/5',
}

export function PayoutStatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${payoutTone[status] ?? payoutTone.sent}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(payoutStatusKey[status] ?? 'marketer.statusPaymentSent')}
    </span>
  )
}