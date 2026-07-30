'use client'

import { useAuthGuard } from '@/hooks/use-auth-guard'
import { Sidebar, MobileDrawer } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SidebarProvider } from '@/components/layout/sidebar-context'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const authStatus = useAuthGuard()

  // null = ยังโหลด localStorage, false = ไม่มี token (กำลัง redirect)
  if (!authStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-muted">
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Mobile drawer + backdrop */}
        <MobileDrawer />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
