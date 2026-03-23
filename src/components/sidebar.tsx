'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  MessageCircle,
  CreditCard,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transaksi', icon: ArrowLeftRight },
  { href: '/dashboard/telegram', label: 'Telegram', icon: MessageCircle },
  { href: '/dashboard/subscription', label: 'Langganan', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-60 flex-col h-full bg-card border-r">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-base">Catetin Duit</span>
        </Link>
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
      <div className="px-4 py-4 border-t">
        <p className="text-[11px] text-muted-foreground">© 2026 Catetin Duit</p>
      </div>
    </aside>
  )
}
