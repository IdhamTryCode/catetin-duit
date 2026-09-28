'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/(auth)/actions'
import { ADMIN_NAV, isAdminNavActive } from './admin-nav'

interface Props {
  profile: { full_name: string | null; email: string }
}

export function AdminSidebar({ profile }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-full w-60 flex-shrink-0 flex-col bg-cd-dark px-3 py-[18px] text-white md:flex">
      <Link href="/admin" className="flex items-center gap-2.5 px-2 pb-[22px] pt-1 text-white">
        <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-[9px]" />
        <span className="flex flex-col">
          <span className="text-base font-bold leading-tight">Catetin Duit</span>
          <span className="text-[11px] font-semibold text-cd-accent-text">Admin Panel</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5 overflow-y-auto text-sm font-medium">
        {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = isAdminNavActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition-colors',
                active ? 'bg-cd-accent font-bold text-cd-dark' : 'text-cd-on-dark hover:bg-cd-dark-2 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-cd-dark-line pt-3 text-sm">
        <p className="truncate px-3 pb-1 text-xs text-cd-on-dark-3">{profile.full_name ?? profile.email}</p>
        <Link href="/dashboard" className="rounded-[10px] px-3 py-2 text-cd-on-dark hover:bg-cd-dark-2 hover:text-white">
          ← Kembali ke App
        </Link>
        <form action={signOut}>
          <button type="submit" className="w-full cursor-pointer rounded-[10px] px-3 py-2 text-left text-[#FF8A8A] hover:bg-cd-dark-2">
            Keluar
          </button>
        </form>
      </div>
    </aside>
  )
}
