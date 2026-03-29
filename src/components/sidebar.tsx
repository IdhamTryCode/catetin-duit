'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  MessageCircle,
  CreditCard,
  Settings,
  Tag,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',              label: 'Beranda',    icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transaksi',  icon: ArrowLeftRight  },
  { href: '/dashboard/categories',   label: 'Kategori',   icon: Tag             },
  { href: '/dashboard/telegram',     label: 'Telegram',   icon: MessageCircle   },
  { href: '/dashboard/subscription', label: 'Langganan',  icon: CreditCard      },
  { href: '/dashboard/settings',     label: 'Pengaturan', icon: Settings        },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-64 flex-col h-full bg-sidebar flex-shrink-0">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <Image
              src="/logo.png"
              alt="Catetin Duit"
              width={20}
              height={20}
              className="rounded-sm"
            />
          </div>
          <span className="font-bold text-base text-sidebar-foreground tracking-tight">
            Catetin Duit
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-[17px] w-[17px] flex-shrink-0',
                  isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-[11px] text-sidebar-foreground/30 font-medium">
          © 2026 Catetin Duit
        </p>
      </div>
    </aside>
  )
}
