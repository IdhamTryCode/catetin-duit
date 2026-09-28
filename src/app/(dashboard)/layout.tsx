import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-cd-bg text-cd-ink">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1120px] p-4 pb-24 md:p-8 md:pb-8">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
