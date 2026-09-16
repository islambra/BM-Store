import { LayoutDashboard, Store, User, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function getAccountRoute(role?: string): string {
  if (!role) return '/login'
  if (role === 'ADMIN') return '/admin'
  if (role === 'MARKETER') return '/marketer'
  if (role === 'SELLER') return '/seller'
  return '/dashboard/profile'
}

export function getAccountLabel(role: string | undefined, t: (key: string) => string): string {
  if (!role) return t('common.account')
  if (role === 'ADMIN') return t('account.adminPanel')
  if (role === 'MARKETER') return t('account.marketerDashboard')
  if (role === 'SELLER') return t('account.sellerDashboard')
  return t('account.dashboard')
}

export function getAccountIcon(role?: string): LucideIcon {
  if (role === 'ADMIN') return LayoutDashboard
  if (role === 'MARKETER') return Store
  if (role === 'SELLER') return ShoppingBag
  return User
}