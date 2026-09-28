import { CreditCard, LayoutDashboard, Megaphone, Settings, Users, Activity } from 'lucide-react'

export const ADMIN_NAV = [
  { href: '/admin',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',      icon: Users           },
  { href: '/admin/payments',  label: 'Pembayaran', icon: CreditCard      },
  { href: '/admin/broadcast', label: 'Broadcast',  icon: Megaphone       },
  { href: '/admin/system',    label: 'Sistem',     icon: Activity        },
  { href: '/admin/settings',  label: 'Pengaturan', icon: Settings        },
]

export function isAdminNavActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}
