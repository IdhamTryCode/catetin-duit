'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { CARD, PageHeader } from '@/components/dashboard/ui'
import { FIELD } from '@/components/dashboard/modal'
import { EndsAt, StatusPill } from '../ui'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin'
  subscription_status: string
  ends_at: string | null
  telegram_chat_id: number | null
  created_at: string
}

const STATUS_FILTERS = [
  ['', 'Semua status'],
  ['trial', 'Trial'],
  ['premium', 'Premium'],
  ['grace_period', 'Masa tenggang'],
  ['expired', 'Sudah berakhir'],
] as const

export default function AdminUsersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = use(searchParams)
  // Status trial_expired/cancelled dari link Overview masuk ke grup "Sudah berakhir".
  const initialStatus = ['trial_expired', 'cancelled'].includes(sp?.status ?? '') ? 'expired' : sp?.status ?? ''
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(initialStatus)
  const [telegram, setTelegram] = useState('')
  const [expiring, setExpiring] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ q: search, status, telegram, expiring: expiring ? '1' : '' })
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(data.users ?? [])
    } catch {
      toast.error('Gagal memuat data user')
    } finally {
      setIsLoading(false)
    }
  }, [search, status, telegram, expiring])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce ketikan pencarian
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" subtitle={`${users.length} user ditampilkan`} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari email atau nama…"
          className={`${FIELD} max-w-xs py-2.5 text-sm`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${FIELD} w-auto py-2.5 text-sm`}>
          {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={telegram} onChange={(e) => setTelegram(e.target.value)} className={`${FIELD} w-auto py-2.5 text-sm`}>
          <option value="">Telegram: semua</option>
          <option value="1">Terhubung</option>
          <option value="0">Belum terhubung</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-cd-line-strong bg-white px-3.5 py-2.5 text-sm font-semibold">
          <input type="checkbox" checked={expiring} onChange={(e) => setExpiring(e.target.checked)} className="accent-[#00754A]" />
          Akan habis ≤ 3 hari
        </label>
      </div>

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-cd-line-soft text-left text-xs text-cd-muted-2">
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Berakhir</th>
              <th className="px-3 py-3 font-semibold">Telegram</th>
              <th className="px-3 py-3 font-semibold">Bergabung</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-cd-muted-2">Memuat…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-cd-muted-2">Tidak ada user yang cocok</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-cd-line-soft last:border-0 hover:bg-[#FAFCFB]">
                <td className="px-5 py-3">
                  <Link href={`/admin/users/${u.id}`} className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-semibold text-cd-ink">
                      {u.full_name ?? '—'}
                      {u.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-cd-primary" aria-label="Admin" />}
                    </span>
                    <span className="text-xs text-cd-muted-2">{u.email}</span>
                  </Link>
                </td>
                <td className="px-3 py-3"><StatusPill status={u.subscription_status} /></td>
                <td className="px-3 py-3 text-[13px]"><EndsAt iso={u.ends_at} /></td>
                <td className="px-3 py-3 text-[13px]">
                  {u.telegram_chat_id ? <span className="font-semibold text-cd-success">● Terhubung</span> : <span className="text-cd-placeholder">Belum</span>}
                </td>
                <td className="px-3 py-3 text-[13px] text-cd-muted-2">
                  {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/admin/users/${u.id}`} className="text-[13px] font-semibold text-cd-primary hover:text-cd-primary-hover">
                    Kelola →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
