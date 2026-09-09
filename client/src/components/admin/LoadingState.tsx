import { LoaderCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

interface LoadingStateProps {
  message?: string
  className?: string
  fullPage?: boolean
}

export default function LoadingState({ message, className, fullPage }: LoadingStateProps) {
  const { t } = useLanguage()

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${fullPage ? 'min-h-[400px]' : ''} ${className || ''}`}
    >
      <LoaderCircle size={28} className="animate-spin text-brand-600" />
      <p className="text-sm text-ink-500">{message || t('common.loading')}</p>
    </div>
  )
}