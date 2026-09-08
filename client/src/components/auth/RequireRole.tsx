import { Navigate, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

export function RequireRole({ roles, children }: { roles: string[]; children: ReactElement }) {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  const loc = useLocation()

  if (loading) {
    return (
      <div className="container-app flex justify-center py-24">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-500">
          <LoaderCircle size={18} className="animate-spin" />
          {t('common.loading')}
        </span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (!roles.includes(user.role)) return <Navigate to="/account" replace />
  return children
}