import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { AdminSidebar } from './admin-sidebar'
import { AdminBottomNav } from './admin-bottom-nav'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')
  return profile
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar profile={profile} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Admin header bar */}
        <div className="h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm text-muted-foreground">
              Admin Panel — <span className="font-semibold text-foreground">{profile.full_name ?? profile.email}</span>
            </p>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <AdminBottomNav />
    </div>
  )
}
