import ConfirmDialog from './ConfirmDialog'
import { useLanguage } from '../../context/LanguageContext'

export default function BecomeMarketerPrompt({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useLanguage()
  return (
    <ConfirmDialog
      open={open}
      title={t('marketer.logoutRequiredTitle')}
      description={t('marketer.logoutRequiredDesc')}
      confirmLabel={t('marketer.logoutAndContinue')}
      cancelLabel={t('common.cancel')}
      onConfirm={onConfirm}
      onCancel={onCancel}
      busy={busy}
      danger={false}
    />
  )
}