import { Navigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import DashboardPage from '../DashboardPage'

/* /dashboard entry: USER accounts go to the client dashboard, others keep the legacy page. */
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
  return <DashboardPage />
}
