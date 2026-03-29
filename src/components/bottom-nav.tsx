'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Tag, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard',              label: 'Beranda',   icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transaksi', icon: ArrowLeftRight  },
  { href: '/dashboard/categories',   label: 'Kategori',  icon: Tag             },
  { href: '/dashboard/settings',     label: 'Profil',    icon: UserCircle      },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="grid grid-cols-4 h-[62px] px-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-all duration-200 relative select-none',
                isActive ? 'text-primary' : 'text-muted-foreground/70'
              )}
            >
              {/* Active pill indicator at top */}
              <span
                className={cn(
                  'absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300',
                  isActive ? 'w-8 bg-primary' : 'w-0 bg-transparent'
                )}
              />

              <Icon
                className={cn(
                  'transition-all duration-200',
                  isActive
                    ? 'h-[22px] w-[22px] stroke-[2.5] scale-110'
                    : 'h-[22px] w-[22px] stroke-[1.75]'
                )}
              />
              <span
                className={cn(
                  'text-[10px] tracking-tight transition-all duration-200',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
