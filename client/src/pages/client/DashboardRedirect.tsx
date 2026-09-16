import { Navigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

/* /dashboard entry: send every role to its own dashboard. */
export default function DashboardRedirect() {
  const { user, loading } = useAuth()
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label={t('common.loading')}>
        <LoaderCircle size={26} className="animate-spin text-ink-300" />
      </div>
    )
  }
  if (user?.role === 'USER') {
    return <Navigate to="/dashboard/profile" replace />
  }
  if (user?.role === 'MARKETER') {
    return <Navigate to="/marketer" replace />
  }
  return <Navigate to="/dashboard/profile" replace />
}
