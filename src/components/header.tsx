import { createClient } from '@/utils/supabase/server'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/(auth)/actions'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { statusBadge } from '@/lib/constants'
import { promoActive } from '@/lib/settings'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, subscription_status, trial_ends_at, subscription_ends_at, role')
    .eq('id', user!.id)
    .single()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const status = profile?.subscription_status
  const planCfg = statusBadge(status, status === 'trial' ? profile?.trial_ends_at : profile?.subscription_ends_at, await promoActive())
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Kamu'

  return (
    <header className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-cd-line bg-white/92 px-4 py-3.5 backdrop-blur-md md:px-8">
      {/* Mobile: Logo */}
      <div className="flex items-center gap-2 md:hidden">
        <Image src="/logo.png" alt="Catetin Duit" width={28} height={28} className="rounded-lg" />
        <span className="text-sm font-bold tracking-tight">Catetin Duit</span>
      </div>

      {/* Desktop: greeting */}
      <p className="m-0 hidden text-sm text-cd-muted-2 md:block">
        Halo, <strong className="text-cd-ink">{firstName}</strong>
      </p>

      <div className="flex items-center gap-2.5">
        <span
          className={
            planCfg.variant === 'destructive'
              ? 'hidden rounded-full bg-[#FDF0F0] px-2.5 py-[5px] text-xs font-bold text-[#8A1F1F] sm:inline-flex'
              : 'hidden rounded-full bg-cd-tint px-2.5 py-[5px] text-xs font-bold text-cd-primary-hover sm:inline-flex'
          }
        >
          {planCfg.label}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Menu akun"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-cd-primary text-[13px] font-bold text-white outline-none transition-shadow hover:shadow-[0_0_0_3px_#CFE3D6] focus-visible:shadow-[0_0_0_3px_#CFE3D6]"
          >
            {initials}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-60 rounded-[14px] border border-cd-line bg-white p-1.5 text-cd-ink shadow-[0_20px_40px_-16px_rgba(6,20,13,.25)]"
          >
            <div className="mb-1 flex flex-col gap-0.5 border-b border-cd-line-soft px-3 pb-3 pt-2.5">
              <span className="text-sm font-bold">{profile?.full_name || 'User'}</span>
              <span className="truncate text-[13px] text-cd-muted-2">{profile?.email}</span>
            </div>
            <DropdownMenuGroup>
              {profile?.role === 'admin' && (
                <DropdownMenuItem className="rounded-[9px] p-0">
                  <Link href="/admin" className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-cd-primary">
                    <ShieldCheck className="h-4 w-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="rounded-[9px] p-0">
                <Link href="/dashboard/subscription" className="w-full px-3 py-2.5 text-sm">Langganan</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-[9px] p-0">
                <Link href="/dashboard/settings" className="w-full px-3 py-2.5 text-sm">Pengaturan</Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1 bg-cd-line-soft" />
            <DropdownMenuGroup>
              <form action={signOut}>
                <DropdownMenuItem className="rounded-[9px] p-0 focus:bg-[#FDF0F0]">
                  <button type="submit" className="w-full cursor-pointer px-3 py-2.5 text-left text-sm text-cd-expense">
                    Keluar
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
