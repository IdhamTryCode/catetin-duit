'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'

const navItems = [
  { href: '/admin',       label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users',    icon: Users           },
]

interface Props {
  profile: { full_name: string | null; email: string }
}

export function AdminSidebar({ profile }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-60 flex-col h-full bg-card border-r">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-2.5 border-b">
        <Image src="/logo.png" alt="Catetin Duit" width={32} height={32} className="rounded-lg flex-shrink-0" />
        <div>
          <p className="font-bold text-sm leading-tight">Catetin Duit</p>
          <div className="flex items-center gap-1 mt-0.5">
            <ShieldCheck className="h-2.5 w-2.5 text-primary" />
            <p className="text-[10px] text-primary font-medium leading-none">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Button
              key={href}
              asChild
              variant={isActive ? 'default' : 'ghost'}
              className={cn('w-full justify-start gap-3', !isActive && 'text-muted-foreground')}
            >
              <Link href={href}>
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'stroke-[2.5]')} />
                {label}
              </Link>
            </Button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t space-y-2">
        <p className="text-xs text-muted-foreground px-2 truncate">{profile.full_name ?? profile.email}</p>
        <Button asChild variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke App
          </Link>
        </Button>
        <form action={signOut}>
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive" size="sm">
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </form>
      </div>
    </aside>
  )
}
