import { useState } from 'react'
import {
  ClipboardList, Gift, HandCoins, Image as ImageIcon, LayoutGrid, Megaphone, MessageSquare, ShieldCheck, Store, Tags, UserRound, Users,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import PageHeader from '../components/common/PageHeader'
import AdminShell from '../components/admin/AdminShell'
import type { AdminTab } from '../components/admin/AdminShell'
import OverviewSection from '../components/admin/OverviewSection'
import ProfileSection from '../components/admin/ProfileSection'
import CustomersSection from '../components/admin/CustomersSection'
import MarketersSection from '../components/admin/MarketersSection'
import SellersSection from '../components/admin/SellersSection'
import StoreRequestsSection from '../components/admin/StoreRequestsSection'
import StoresSection from '../components/admin/StoresSection'
import OrdersSection from '../components/admin/OrdersSection'
import ProductsSection from '../components/admin/ProductsSection'
import CategoriesSection from '../components/admin/CategoriesSection'
import RewardsSection from '../components/admin/RewardsSection'
import BannersSection from '../components/admin/BannersSection'
import PostsSection from '../components/admin/PostsSection'
import PayoutsSection from '../components/admin/PayoutsSection'

export default function AdminPage() {
  const { t } = useLanguage()
  const [active, setActive] = useState('overview')

  const tabs: AdminTab[] = [
    { id: 'overview', label: t('admin.tabs.overview'), icon: ShieldCheck },
    { id: 'profile', label: t('admin.tabs.profile'), icon: UserRound },
    { id: 'customers', label: t('admin.tabs.customers'), icon: Users },
    { id: 'marketers', label: t('admin.tabs.marketers'), icon: Megaphone },
    { id: 'sellers', label: t('admin.tabs.sellers'), icon: Store },
    { id: 'storeRequests', label: t('admin.tabs.storeRequests'), icon: Store },
    { id: 'stores', label: t('admin.tabs.stores'), icon: Store },
    { id: 'orders', label: t('admin.tabs.orders'), icon: ClipboardList },
    { id: 'products', label: t('admin.tabs.products'), icon: Tags },
    { id: 'categories', label: t('admin.tabs.categories'), icon: LayoutGrid },
    { id: 'rewards', label: t('admin.tabs.rewards'), icon: Gift },
    { id: 'banners', label: t('admin.tabs.banners'), icon: ImageIcon },
    { id: 'posts', label: t('admin.tabs.posts'), icon: MessageSquare },
    { id: 'payouts', label: t('admin.tabs.payouts'), icon: HandCoins },
  ]

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader icon={ShieldCheck} title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <AdminShell tabs={tabs} active={active} onNavigate={setActive}>
        {active === 'overview' && <OverviewSection />}
        {active === 'profile' && <ProfileSection />}
        {active === 'customers' && <CustomersSection />}
        {active === 'marketers' && <MarketersSection />}
        {active === 'sellers' && <SellersSection />}
        {active === 'storeRequests' && <StoreRequestsSection />}
        {active === 'stores' && <StoresSection />}
        {active === 'orders' && <OrdersSection />}
        {active === 'products' && <ProductsSection />}
        {active === 'categories' && <CategoriesSection />}
        {active === 'rewards' && <RewardsSection />}
        {active === 'banners' && <BannersSection />}
        {active === 'posts' && <PostsSection />}
        {active === 'payouts' && <PayoutsSection />}
      </AdminShell>
    </div>
  )
}