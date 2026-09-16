import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ClipboardList, HandCoins, LayoutDashboard, Link2, Package, Settings, Store, User } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getSellerMe } from '../services/api'
import PageHeader from '../components/common/PageHeader'
import SellerShell from '../components/seller/SellerShell'
import StoreRequestSection from '../components/seller/StoreRequestSection'
import SellerOverviewSection from '../components/seller/OverviewSection'
import SellerStoreSection from '../components/seller/StoreSection'
import SellerProductsSection from '../components/seller/ProductsSection'
import SellerCategoriesSection from '../components/seller/CategoriesSection'
import SellerOrdersSection from '../components/seller/OrdersSection'
import SellerEarningsSection from '../components/seller/EarningsSection'
import SellerSubscriptionSection from '../components/seller/SubscriptionSection'
import SellerProfileSection from '../components/seller/ProfileSection'
import { Alert } from '../components/common/FormControls'

const tabs = [
  { id: 'overview', labelKey: 'seller.tabOverview', icon: LayoutDashboard },
  { id: 'store', labelKey: 'seller.tabStore', icon: Store },
  { id: 'products', labelKey: 'seller.tabProducts', icon: Package },
  { id: 'categories', labelKey: 'seller.tabCategories', icon: Link2 },
  { id: 'orders', labelKey: 'seller.tabOrders', icon: ClipboardList },
  { id: 'earnings', labelKey: 'seller.tabEarnings', icon: HandCoins },
  { id: 'subscription', labelKey: 'seller.tabSubscription', icon: Settings },
  { id: 'profile', labelKey: 'seller.tabProfile', icon: User },
] as const

type TabId = (typeof tabs)[number]['id']

const subscriptionTab: (typeof tabs)[number] = tabs.find((tab) => tab.id === 'subscription')!

export default function SellerPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [store, setStore] = useState<{ id: string; slug: string; status?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getSellerMe()
      .then((res) => {
        if (alive) setStore(res.store)
      })
      .catch(() => {
        if (alive) setStore(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [])

  const active = (tabs.find((tab) => tab.id !== 'overview' && location.pathname.endsWith(`/seller/${tab.id}`))?.id ?? 'overview') as TabId

  if (loading) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-ink-900/10" />
          <div className="h-4 w-96 rounded bg-ink-900/10" />
          <div className="rounded-2xl border border-line bg-surface p-6 h-48" />
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="container-app pt-6 sm:pt-10">
        <StoreRequestSection />
      </div>
    )
  }

  const storeStatus = store.status ?? 'active'

  // Subscribed sellers work normally; lapsed/deleted stores only get access to
  // the subscription tab so they can renew and restore everything.
  if (storeStatus !== 'active') {
    const lockedTitle =
      storeStatus === 'expired'
        ? t('seller.locked.expiredTitle')
        : storeStatus === 'deleted'
          ? t('seller.locked.deletedTitle')
          : storeStatus === 'suspended'
            ? t('seller.locked.suspendedTitle')
            : t('seller.locked.otherTitle', { status: storeStatus })
    const lockedMessage =
      storeStatus === 'expired'
        ? t('seller.locked.expired')
        : storeStatus === 'deleted'
          ? t('seller.locked.deleted')
          : storeStatus === 'suspended'
            ? t('seller.locked.suspended')
            : t('seller.locked.other', { status: storeStatus })
    const renewAllowed = storeStatus === 'expired' || storeStatus === 'deleted'

    return (
      <div className="container-app pt-6 sm:pt-10">
        <PageHeader icon={AlertTriangle} title={lockedTitle} subtitle={t('seller.dashboard')} />
        <Alert tone={storeStatus === 'suspended' ? 'error' : 'warning'}>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <AlertTriangle size={16} />
            {lockedMessage}
          </span>
        </Alert>

        {renewAllowed ? (
          <div className="mt-6">
            <SellerShell
              tabs={[subscriptionTab]}
              active="subscription"
              onSelect={(id) => navigate(id === 'overview' ? '/seller' : `/seller/${id}`)}
              header={
                <PageHeader
                  icon={Settings}
                  title={t('seller.tabSubscription')}
                  subtitle={t('seller.subscription.subtitle')}
                />
              }
            >
              <SellerSubscriptionSection />
            </SellerShell>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
            <p className="text-sm text-ink-600">{t('seller.locked.contactAdmin')}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <SellerShell
      tabs={[...tabs]}
      active={active}
      onSelect={(id) => navigate(id === 'overview' ? '/seller' : `/seller/${id}`)}
      header={
        <PageHeader
          icon={Package}
          title={t('seller.dashboard')}
          subtitle={t(tabs.find((tab) => tab.id === active)?.labelKey ?? 'seller.tabOverview')}
        />
      }
    >
      {active === 'overview' && <SellerOverviewSection />}
      {active === 'store' && <SellerStoreSection />}
      {active === 'products' && <SellerProductsSection />}
      {active === 'categories' && <SellerCategoriesSection />}
      {active === 'orders' && <SellerOrdersSection />}
      {active === 'earnings' && <SellerEarningsSection />}
      {active === 'subscription' && <SellerSubscriptionSection />}
      {active === 'profile' && <SellerProfileSection />}
    </SellerShell>
  )
}