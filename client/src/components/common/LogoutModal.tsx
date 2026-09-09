import ConfirmDialog from './ConfirmDialog'
import { useLanguage } from '../../context/LanguageContext'

export default function LogoutModal({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLanguage()

  return (
    <ConfirmDialog
      open={open}
      title={t('common.logoutTitle')}
      description={t('common.logoutDesc')}
      confirmLabel={t('common.logout')}
      cancelLabel={t('common.cancel')}
      danger
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}