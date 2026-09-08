import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, MapPin, Heart, Settings, LogOut, Store, ShieldCheck, ChevronRight, ChevronLeft, AlertTriangle, Phone } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage, getMyOrders } from '../services/api'
import EmptyState from '../components/common/EmptyState'
import PageHeader from '../components/common/PageHeader'
import OrderStatusBadge from '../components/common/OrderStatusBadge'
import { Alert, Toggle } from '../components/common/FormControls'
import { formatPrice } from '../components/common/Price'
import { ORDERS_STORAGE_KEY } from '../config/shop'
import type { Order } from '../types'

const sections = [
  { id: 'profile', icon: User, key: 'account.profile' },
  { id: 'orders', icon: Package, key: 'account.orders' },
  { id: 'addresses', icon: MapPin, key: 'account.addresses' },
  { id: 'wishlist', icon: Heart, key: 'account.wishlist' },
  { id: 'settings', icon: Settings, key: 'account.settings' },
] as const

type SectionId = (typeof sections)[number]['id']

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
  const { user, logout, becomeMarketer } = useAuth()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null)

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

  const onBecomeMarketer = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await becomeMarketer()
      setNotice({ tone: 'info', text: t('account.becomeMarketerDone') })
    } catch (err) {
      setNotice({ tone: 'danger', text: getErrorMessage(err) })
    } finally {
      setBusy(false)
    }
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
            <p className="text-sm text-ink-500">{user.email}</p>
          </div>
        </div>
        <button type="button" onClick={() => void logout()} className="btn-secondary shrink-0 text-danger-600 hover:text-danger-700">
          <LogOut size={16} />
          {t('common.logout')}
        </button>
      </div>

      {notice && (
        <Alert tone={notice.tone} className="mt-4">
          {notice.text}
        </Alert>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {user.role === 'USER' && (
          <button type="button" onClick={() => void onBecomeMarketer()} disabled={busy} className="btn-primary justify-start disabled:opacity-60">
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
                {new Date(o.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-US', {
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

export default function AccountPage() {
  const { t, lang } = useLanguage()
  const [active, setActive] = useState<SectionId>('profile')
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight

  const [notifState, setNotifState] = useState({ email: true, push: false, updates: true })

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader icon={User} title={t('account.title')} subtitle={t('account.subtitle')} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Nav */}
        <aside>
          <div className="flex gap-1 overflow-x-auto no-scrollbar lg:sticky lg:top-32 lg:flex-col lg:gap-1.5 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-3">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition-colors lg:w-full ${
                  active === s.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-700 hover:bg-ink-900/5'
                }`}
              >
                <s.icon size={18} />
                {t(s.key)}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <section>
          {active === 'profile' && <ProfileCard />}

          {active === 'orders' && <OrdersPanel />}

          {active === 'addresses' && (
            <div className="rounded-2xl border border-line bg-surface">
              <EmptyState icon={MapPin} title={t('account.addresses')} description={t('account.addressesDesc')} />
            </div>
          )}

          {active === 'wishlist' && (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">{t('account.wishlist')}</h2>
                  <p className="mt-1 text-sm text-ink-500">{t('account.wishlistDesc')}</p>
                </div>
                <Link to="/wishlist" className="btn-primary shrink-0">
                  {t('common.wishlist')}
                  <Chevron size={16} />
                </Link>
              </div>
            </div>
          )}

          {active === 'settings' && (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="text-lg font-bold text-ink-900">{t('account.settings')}</h2>
              <div className="mt-5 space-y-3">
                {[
                  { key: 'email' as const, label: t('account.emailNotif') },
                  { key: 'push' as const, label: t('account.pushNotif') },
                  { key: 'updates' as const, label: t('account.orderUpdates') },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-xl border border-line p-4">
                    <span className="text-sm font-medium text-ink-700">{item.label}</span>
                    <Toggle
                      checked={notifState[item.key]}
                      onChange={(v) => setNotifState((s) => ({ ...s, [item.key]: v }))}
                      label={item.label}
                    />
                  </div>
                ))}
                <p className="pt-1 text-xs text-ink-400">{t('account.comingSoon')}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}