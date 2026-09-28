'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_NAV, isAdminNavActive } from './admin-nav'

/** Navigasi admin di HP: bisa digeser horizontal karena menunya 6. */
export function AdminBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 overflow-x-auto border-t border-cd-line bg-white/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 min-w-max">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = isAdminNavActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex w-[74px] flex-col items-center justify-center gap-0.5', active ? 'text-cd-primary' : 'text-cd-muted-2')}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
              <span className={cn('text-[10px]', active ? 'font-bold' : 'font-medium')}>{label}</span>
            </Link>
          )
        })}
        <Link href="/dashboard" className="flex w-[74px] flex-col items-center justify-center gap-0.5 text-cd-muted-2">
          <span className="text-lg leading-5">←</span>
          <span className="text-[10px] font-medium">App</span>
        </Link>
      </div>
    </nav>
  )
}
