'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',              label: 'Beranda'    },
  { href: '/dashboard/transactions', label: 'Transaksi'  },
  { href: '/dashboard/categories',   label: 'Kategori'   },
  { href: '/dashboard/telegram',     label: 'Telegram'   },
  { href: '/dashboard/subscription', label: 'Langganan'  },
  { href: '/dashboard/settings',     label: 'Pengaturan' },
]

/** Aktif juga untuk sub-halaman (mis. /dashboard/transactions/new). */
export function isNavActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-60 flex-shrink-0 flex-col bg-cd-dark px-3 py-[18px] text-white md:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-[22px] pt-1 text-white">
        <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px]" />
        <span className="text-base font-bold">Catetin Duit</span>
      </Link>

      <nav className="flex flex-col gap-0.5 overflow-y-auto text-sm font-medium">
        {navItems.map(({ href, label }) => {
          const active = isNavActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-[10px] px-3 py-2.5 transition-colors',
                active ? 'bg-cd-accent font-bold text-cd-dark' : 'text-cd-on-dark hover:bg-cd-dark-2 hover:text-white',
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <span className="mt-auto p-2 text-xs text-[#5D7466]">© {new Date().getFullYear()} Catetin Duit</span>
    </aside>
  )
}
