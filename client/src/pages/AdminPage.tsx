import { useState } from 'react'
import {
  ClipboardList, Image as ImageIcon, LayoutGrid, Megaphone, MessageSquare, ShieldCheck, Tags, UserRound, Users,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import PageHeader from '../components/common/PageHeader'
import AdminShell from '../components/admin/AdminShell'
import type { AdminTab } from '../components/admin/AdminShell'
import OverviewSection from '../components/admin/OverviewSection'
import ProfileSection from '../components/admin/ProfileSection'
import CustomersSection from '../components/admin/CustomersSection'
import MarketersSection from '../components/admin/MarketersSection'
import OrdersSection from '../components/admin/OrdersSection'
import ProductsSection from '../components/admin/ProductsSection'
import CategoriesSection from '../components/admin/CategoriesSection'
import BannersSection from '../components/admin/BannersSection'
import PostsSection from '../components/admin/PostsSection'

export default function AdminPage() {
  const { t } = useLanguage()
  const [active, setActive] = useState('overview')

  const tabs: AdminTab[] = [
    { id: 'overview', label: t('admin.tabs.overview'), icon: ShieldCheck },
    { id: 'profile', label: t('admin.tabs.profile'), icon: UserRound },
    { id: 'customers', label: t('admin.tabs.customers'), icon: Users },
    { id: 'marketers', label: t('admin.tabs.marketers'), icon: Megaphone },
    { id: 'orders', label: t('admin.tabs.orders'), icon: ClipboardList },
    { id: 'products', label: t('admin.tabs.products'), icon: Tags },
    { id: 'categories', label: t('admin.tabs.categories'), icon: LayoutGrid },
    { id: 'banners', label: t('admin.tabs.banners'), icon: ImageIcon },
    { id: 'posts', label: t('admin.tabs.posts'), icon: MessageSquare },
  ]

  return (
    <div className="container-app pt-6 sm:pt-10">
      <PageHeader icon={ShieldCheck} title={t('admin.title')} subtitle={t('admin.subtitle')} />
      <AdminShell tabs={tabs} active={active} onNavigate={setActive}>
        {active === 'overview' && <OverviewSection />}
        {active === 'profile' && <ProfileSection />}
        {active === 'customers' && <CustomersSection />}
        {active === 'marketers' && <MarketersSection />}
        {active === 'orders' && <OrdersSection />}
        {active === 'products' && <ProductsSection />}
        {active === 'categories' && <CategoriesSection />}
        {active === 'banners' && <BannersSection />}
        {active === 'posts' && <PostsSection />}
      </AdminShell>
    </div>
  )
}