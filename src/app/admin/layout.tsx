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
    <div className="flex h-screen overflow-hidden bg-cd-bg text-cd-ink">
      <AdminSidebar profile={profile} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-cd-line bg-white/92 px-4 py-3.5 backdrop-blur-md md:px-8">
          <p className="m-0 text-sm text-cd-muted-2">
            Admin Panel · <strong className="text-cd-ink">{profile.full_name ?? profile.email}</strong>
          </p>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1120px] p-4 pb-24 md:p-8 md:pb-8">{children}</div>
        </main>
      </div>

      <AdminBottomNav />
    </div>
  )
}
