import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Heart, LayoutDashboard, LogOut, Megaphone, Package, Phone, ShieldCheck, Store, User } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/common/PageHeader'
import EmptyState from '../components/common/EmptyState'
import OrderStatusBadge from '../components/common/OrderStatusBadge'
import BecomeMarketerPrompt from '../components/common/BecomeMarketerPrompt'
import { formatPrice } from '../components/common/Price'
import { getMyOrders } from '../services/api'
import { ORDERS_STORAGE_KEY } from '../config/shop'
import { useBecomeMarketer } from '../hooks/useBecomeMarketer'
import type { Order } from '../types'

const roleKey = (role: string) =>
  role === 'ADMIN' ? 'account.roleAdmin' : role === 'MARKETER' ? 'account.roleMarketer' : 'account.roleUser'

function loadLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Order[]) : []
  } catch {
    return []
  }
}

function ProfileCard() {
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const become = useBecomeMarketer()

  if (!user) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <User size={30} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink-900">{t('account.guest')}</h2>
            <p className="text-sm text-ink-500">{t('account.signInPrompt')}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/login" className="btn-primary">
            {t('auth.signIn')}
          </Link>
          <Link to="/register" className="btn-secondary">
            {t('auth.createAccount')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <User size={30} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink-900">{user.name}</h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                {t(roleKey(user.role))}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-ink-500">
              <Phone size={13} className="shrink-0" />
              {user.email ? `${user.email} · ${user.phone ?? ''}` : (user.phone ?? '')}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void logout()} className="btn-secondary shrink-0 text-danger-600 hover:text-danger-700">
          <LogOut size={16} />
          {t('common.logout')}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {user.role === 'USER' && (
          <button type="button" onClick={become.open} className="btn-primary justify-start">
            <Store size={17} />
            {t('account.becomeMarketer')}
          </button>
        )}
        {(user.role === 'MARKETER' || user.role === 'ADMIN') && (
          <Link to="/marketer" className="btn-primary justify-start">
            <Store size={17} />
            {t('account.marketerDashboard')}
          </Link>
        )}
        {user.role === 'ADMIN' && (
          <Link to="/admin" className="btn-secondary justify-start">
            <ShieldCheck size={17} />
            {t('account.adminPanel')}
          </Link>
        )}
      </div>

      {user.role === 'USER' && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {t('account.becomeMarketerDesc')}
        </p>
      )}

      <BecomeMarketerPrompt
        open={become.promptOpen}
        busy={become.busy}
        onCancel={() => become.setPromptOpen(false)}
        onConfirm={() => void become.confirmLogoutAndContinue()}
      />
    </div>
  )
}

function OrdersPanel() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const [local, setLocal] = useState<Order[]>([])
  const [apiOrders, setApiOrders] = useState<Record<string, unknown>[] | null>(null)

  useEffect(() => {
    setLocal(loadLocalOrders())
    if (user) {
      getMyOrders()
        .then((res) => setApiOrders(res.orders))
        .catch(() => setApiOrders(null))
    }
  }, [user])

  const renderList = (orders: Order[]) =>
    orders.length === 0 ? (
      <div className="rounded-2xl border border-line bg-surface">
        <EmptyState icon={Package} title={t('account.orders')} description={t('account.ordersEmpty')} />
      </div>
    ) : (
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id ?? o._id} className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-900">{o.id}</span>
                <OrderStatusBadge status={o.status} />
              </div>
              <span className="text-xs text-ink-400">
                {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {o.items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-700">
                    {item.name} <span className="text-ink-400">× {item.qty}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink-900">{formatPrice(item.price * item.qty, lang)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="flex items-center gap-1.5 text-xs text-ink-400">
                <Phone size={13} />
                {o.customer.phone}
              </span>
              <span className="text-sm font-extrabold text-ink-900">{formatPrice(o.total, lang)}</span>
            </div>
          </div>
        ))}
      </div>
    )

  return (
    <div className="space-y-6">
      {renderList(local)}
      {user && apiOrders && apiOrders.length > 0 && (
        <div>
          <div className="mb-3 text-sm font-bold text-ink-900">{t('account.onlineOrders')}</div>
          {renderList(
            (apiOrders as unknown as Order[]).map((o) => {
              const rec = o as unknown as Record<string, unknown>
              return { ...o, id: String(rec.orderRef ?? rec._id) }
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const become = useBecomeMarketer()
  const Chevron = lang === 'ar' ? ArrowLeft : ArrowRight

  const quickLinks = [
    { to: '/dashboard', icon: Package, title: t('dashboard.orders'), desc: t('dashboard.ordersDesc') },
    { to: '/wishlist', icon: Heart, title: t('common.wishlist'), desc: t('dashboard.wishlistDesc') },
    { to: '/special-offers', icon: Megaphone, title: t('nav.deals'), desc: t('dashboard.offersDesc') },
  ]

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader
        icon={LayoutDashboard}
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle', { name: user?.name ?? '' })}
      />

      <ProfileCard />

      {user?.role === 'USER' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink-900">{t('dashboard.marketer')}</h2>
            <p className="mt-1 text-sm text-ink-600">{t('dashboard.marketerDesc')}</p>
          </div>
          <button type="button" onClick={become.open} className="btn-primary shrink-0">
            <Megaphone size={16} />
            {t('account.signUpMarketer')}
            <Chevron size={16} />
          </button>
        </div>
      )}

      <BecomeMarketerPrompt
        open={become.promptOpen}
        busy={become.busy}
        onCancel={() => become.setPromptOpen(false)}
        onConfirm={() => void become.confirmLogoutAndContinue()}
      />

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-ink-900">{t('account.orders')}</h2>
        <OrdersPanel />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-brand-300"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <link.icon size={20} />
            </span>
            <h3 className="mt-4 flex items-center justify-between gap-2 font-bold text-ink-900">
              {link.title}
              <Chevron
                size={16}
                className={`text-ink-300 transition-transform group-hover:-translate-x-0.5 ${
                  lang === 'ar' ? '' : 'group-hover:translate-x-0.5'
                }`}
              />
            </h3>
            <p className="mt-1 text-sm text-ink-500">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}