import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Subtle mesh gradient — gives glassmorphism cards something to blur against */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute -top-[10%] right-0 w-[55vw] h-[55vh] rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.65 0.155 162 / 0.10) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 left-[10%] w-[40vw] h-[50vh] rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.58 0.17 162 / 0.07) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-[40%] left-[35%] w-[25vw] h-[30vh] rounded-full"
          style={{
            background: 'radial-gradient(circle, oklch(0.72 0.14 162 / 0.05) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
