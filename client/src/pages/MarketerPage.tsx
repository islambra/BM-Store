import { useState } from 'react'
import { ClipboardList, HandCoins, LayoutDashboard, Link2, Megaphone, UserRound, Wallet } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import PageHeader from '../components/common/PageHeader'
import MarketerShell from '../components/marketer/MarketerShell'
import OverviewSection from '../components/marketer/OverviewSection'
import ReferralLinksSection from '../components/marketer/ReferralLinksSection'
import OrdersSection from '../components/marketer/OrdersSection'
import EarningsSection from '../components/marketer/EarningsSection'
import PaymentsSection from '../components/marketer/PaymentsSection'
import ProfileSection from '../components/marketer/ProfileSection'

const tabs = [
  { id: 'overview', labelKey: 'marketer.tabOverview', icon: LayoutDashboard },
  { id: 'links', labelKey: 'marketer.tabReferralLinks', icon: Link2 },
  { id: 'orders', labelKey: 'marketer.tabOrders', icon: ClipboardList },
  { id: 'earnings', labelKey: 'marketer.tabEarnings', icon: Wallet },
  { id: 'payments', labelKey: 'marketer.tabPayments', icon: HandCoins },
  { id: 'profile', labelKey: 'marketer.tabProfile', icon: UserRound },
] as const

type TabId = (typeof tabs)[number]['id']

export default function MarketerPage() {
  const { t } = useLanguage()
  const [active, setActive] = useState<TabId>('overview')

  return (
    <MarketerShell
      tabs={[...tabs]}
      active={active}
      onSelect={(id) => setActive(id as TabId)}
      header={
        <PageHeader icon={Megaphone} title={t('marketer.title')} subtitle={t('marketer.subtitle')} />
      }
    >
      {active === 'overview' && <OverviewSection />}
      {active === 'links' && <ReferralLinksSection />}
      {active === 'orders' && <OrdersSection />}
      {active === 'earnings' && <EarningsSection />}
      {active === 'payments' && <PaymentsSection />}
      {active === 'profile' && <ProfileSection />}
    </MarketerShell>
  )
}