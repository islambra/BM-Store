import ConfirmDialog from './ConfirmDialog'
import { LogOut } from 'lucide-react'
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
  const { t, lang } = useLanguage()
  const rtl = lang === 'ar'

  return (
    <ConfirmDialog
      open={open}
      title={t('common.logoutTitle')}
      description={t('common.logoutDesc')}
      confirmLabel={t('common.logout')}
      cancelLabel={t('common.cancel')}
      danger
      busy={busy}
      icon={<LogOut size={22} className={rtl ? '-scale-x-100' : ''} />}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}