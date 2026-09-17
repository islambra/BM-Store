import { useLanguage } from '../../context/LanguageContext'

export default function TypingIndicator() {
  const { t } = useLanguage()
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-ss-md border border-line bg-surface px-3 py-2 text-xs text-ink-500">
        {t('chat.typing')}
      </div>
    </div>
  )
}
