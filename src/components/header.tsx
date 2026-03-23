import { createClient } from '@/utils/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/(auth)/actions'
import { Crown, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  trial: { label: 'Trial', variant: 'secondary' },
  premium: { label: '✦ Premium', variant: 'default' },
  trial_expired: { label: 'Expired', variant: 'destructive' },
  grace_period: { label: 'Grace', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, subscription_status')
    .eq('id', user!.id)
    .single()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const status = profile?.subscription_status ?? 'trial'
  const statusCfg = statusConfig[status] ?? statusConfig.trial
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Kamu'

  return (
    <header className="h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between flex-shrink-0">
      {/* Mobile: Logo | Desktop: Page title area */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">C</span>
        </div>
        <span className="font-bold text-sm">Catetin Duit</span>
      </div>

      {/* Desktop: greeting */}
      <div className="hidden md:block">
        <p className="text-sm text-muted-foreground">
          Halo, <span className="font-semibold text-foreground">{firstName}</span> 👋
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Status badge */}
        <Badge variant={statusCfg.variant} className="hidden sm:inline-flex gap-1">
          {status === 'premium' && <Crown className="h-3 w-3" />}
          {statusCfg.label}
        </Badge>

        {/* Avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold leading-none">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/dashboard/subscription" className="flex items-center gap-2 w-full">
                  <Crown className="h-4 w-4" />
                  Langganan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/dashboard/settings" className="flex items-center gap-2 w-full">
                  <Settings className="h-4 w-4" />
                  Pengaturan
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <form action={signOut}>
                <DropdownMenuItem className="text-destructive cursor-pointer">
                  <button type="submit" className="flex items-center gap-2 w-full">
                    <LogOut className="h-4 w-4" />
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
