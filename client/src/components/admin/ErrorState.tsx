import { AlertCircle, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const { t } = useLanguage()

  return (
    <div className={`flex flex-col items-center justify-center gap-4 rounded-2xl border border-danger-200 bg-danger-50 p-8 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 text-danger-600">
        <AlertCircle size={24} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-danger-900">{t('admin.error')}</h3>
        <p className="mt-1 text-sm text-danger-700">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary">
          <RefreshCw size={16} className="mr-2" />
          {t('common.refresh')}
        </button>
      )}
    </div>
  )
}