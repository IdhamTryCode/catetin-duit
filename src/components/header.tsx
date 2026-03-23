import { createClient } from '@/utils/supabase/server'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/(auth)/actions'
import { Badge } from '@/components/ui/badge'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, subscription_status, trial_ends_at')
    .eq('id', user!.id)
    .single()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const statusColor: Record<string, string> = {
    trial: 'bg-blue-500',
    premium: 'bg-green-500',
    trial_expired: 'bg-red-500',
    grace_period: 'bg-yellow-500',
    cancelled: 'bg-gray-500',
  }

  const statusLabel: Record<string, string> = {
    trial: 'Trial',
    premium: 'Premium',
    trial_expired: 'Trial Expired',
    grace_period: 'Grace Period',
    cancelled: 'Cancelled',
  }

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        {profile?.subscription_status && (
          <Badge
            variant="secondary"
            className={cn('text-white text-xs', statusColor[profile.subscription_status])}
          >
            {statusLabel[profile.subscription_status] ?? profile.subscription_status}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <a href="/dashboard/settings" className="w-full">Pengaturan</a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <form action={signOut}>
                <DropdownMenuItem className="text-destructive cursor-pointer">
                  <button type="submit" className="w-full text-left">
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

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
