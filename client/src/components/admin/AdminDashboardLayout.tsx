import { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import AdminPageHeader from './AdminPageHeader'

interface AdminDashboardLayoutProps {
  pageTitle: string
  pageSubtitle?: string
  pageAction?: React.ReactNode
  children: React.ReactNode
}

export default function AdminDashboardLayout({
  pageTitle,
  pageSubtitle,
  pageAction,
  children,
}: AdminDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <AdminHeader
          title={pageTitle}
          subtitle={pageSubtitle}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AdminPageHeader title={pageTitle} subtitle={pageSubtitle} action={pageAction} />
          <div className="mt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}