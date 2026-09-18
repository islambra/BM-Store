import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'

/**
 * Shows a toast telling the visitor to log in, with an explicit "Log in"
 * action. Nothing navigates until the visitor chooses to, so an accidental
 * like/comment tap never yanks them off the page.
 */
export function useLoginPrompt() {
  const { t } = useLanguage()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    notify({
      tone: 'info',
      title: t('toast.loginRequiredTitle'),
      description: t('toast.loginRequiredDesc'),
      action: {
        label: t('common.login'),
        onClick: () => navigate('/login', { state: { from: location.pathname } }),
      },
    })
  }, [notify, navigate, location.pathname, t])
}
