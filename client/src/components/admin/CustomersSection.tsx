import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { formatPrice } from '../common/Price'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

const roleLabel: Record<string, string> = {
  USER: 'account.roleUser',
  MARKETER: 'account.roleMarketer',
  ADMIN: 'account.roleAdmin',
}

export default function CustomersSection() {
  const { t, lang } = useLanguage()
  const { data, loading, error } = useAsync(() => api.getAdminUsers())

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  return (
    <Table headers={[t('admin.name'), t('admin.email'), t('admin.role'), t('admin.ordersCount'), t('admin.totalSpent'), t('admin.joined')]}>
      {(data?.users ?? []).map((u) => (
        <tr key={String(u._id)} className="hover:bg-canvas">
          <td className="px-4 py-3 font-semibold text-ink-900">{u.name}</td>
          <td className="px-4 py-3 text-ink-500">{u.email}</td>
          <td className="px-4 py-3">
            <Badge tone="muted">{t(roleLabel[u.role] ?? u.role)}</Badge>
          </td>
          <td className="px-4 py-3 text-ink-500">{u.orderCount ?? 0}</td>
          <td className="px-4 py-3 font-semibold text-ink-900">{formatPrice(u.totalSpent ?? 0, lang)}</td>
          <td className="px-4 py-3 text-ink-500">{new Date(u.createdAt).toLocaleDateString()}</td>
          <td />
        </tr>
      ))}
    </Table>
  )
}