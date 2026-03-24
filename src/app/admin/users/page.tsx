'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Search, Shield, ShieldOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { adminUpdateUserPlan, adminUpdateUserRole } from '../actions'
import { PLAN_NAMES, type Plan } from '@/lib/constants'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  plan: Plan
  role: 'user' | 'admin'
  subscription_status: string
  created_at: string
  telegram_chat_id: number | null
}

interface ApiResponse {
  users: UserRow[]
  total: number
}

function PlanSelect({ user, onChanged }: { user: UserRow; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition()

  function handleChange(plan: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.append('user_id', user.id)
      fd.append('plan', plan)
      const result = await adminUpdateUserPlan(fd)
      if (result?.error) toast.error(result.error)
      else { toast.success(`Plan ${user.email} diubah ke ${PLAN_NAMES[plan as Plan]}`); onChanged() }
    })
  }

  return (
    <Select value={user.plan} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-7 w-28 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="free">Free</SelectItem>
        <SelectItem value="starter">Starter</SelectItem>
        <SelectItem value="premium">Premium</SelectItem>
      </SelectContent>
    </Select>
  )
}

function RoleToggle({ user, onChanged }: { user: UserRow; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition()

  function toggle() {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    if (!confirm(`Ubah role ${user.email} ke "${newRole}"?`)) return
    startTransition(async () => {
      const fd = new FormData()
      fd.append('user_id', user.id)
      fd.append('role', newRole)
      const result = await adminUpdateUserRole(fd)
      if (result?.error) toast.error(result.error)
      else { toast.success('Role berhasil diubah'); onChanged() }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title={user.role === 'admin' ? 'Hapus admin' : 'Jadikan admin'}
      className="p-1.5 rounded hover:bg-muted transition-colors"
    >
      {user.role === 'admin'
        ? <Shield className="h-3.5 w-3.5 text-primary" />
        : <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`)
      const data: ApiResponse = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast.error('Gagal memuat data user')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [search])

  const statusColor: Record<string, string> = {
    trial:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    premium:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    trial_expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    grace_period:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    cancelled:     'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{total} user terdaftar</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari email atau nama..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Telegram</th>
                  <th className="text-left px-4 py-3 font-medium">Bergabung</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Tidak ada user ditemukan</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[180px]">{u.full_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColor[u.subscription_status] ?? ''}`}>
                        {u.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.telegram_chat_id ? 'default' : 'outline'} className="text-[10px]">
                        {u.telegram_chat_id ? 'Terhubung' : 'Belum'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <PlanSelect user={u} onChanged={load} />
                    </td>
                    <td className="px-4 py-3">
                      <RoleToggle user={u} onChanged={load} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))
        ) : users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name ?? '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <RoleToggle user={u} onChanged={load} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColor[u.subscription_status] ?? ''}`}>
                  {u.subscription_status}
                </span>
                <Badge variant={u.telegram_chat_id ? 'default' : 'outline'} className="text-[10px]">
                  {u.telegram_chat_id ? 'Telegram ✓' : 'Telegram —'}
                </Badge>
              </div>
              <PlanSelect user={u} onChanged={load} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
