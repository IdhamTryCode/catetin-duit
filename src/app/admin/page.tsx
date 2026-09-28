import Link from 'next/link'
import { startOfMonth } from 'date-fns'
import { createAdminClient } from '@/utils/supabase/admin'
import { STATUS_NAMES } from '@/lib/constants'
import { getSettings, isPromoActive } from '@/lib/settings'
import { formatIDR } from '@/lib/utils'
import { CARD, PageHeader } from '@/components/dashboard/ui'
import { EndsAt, StatCard, StatusPill } from './ui'

export const dynamic = 'force-dynamic'

async function getStats() {
  const supabase = createAdminClient()

  const [
    { data: profiles },
    { count: totalTransactions },
    { data: paidThisMonth },
    settings,
  ] = await Promise.all([
    supabase.from('profiles')
      .select('id, full_name, email, subscription_status, trial_ends_at, subscription_ends_at, telegram_chat_id, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('payments').select('amount').eq('status', 'paid').gte('paid_at', startOfMonth(new Date()).toISOString()),
    getSettings(),
  ])

  const users = profiles ?? []
  const byStatus: Record<string, number> = { trial: 0, premium: 0, grace_period: 0, trial_expired: 0, cancelled: 0 }
  for (const p of users) byStatus[p.subscription_status] = (byStatus[p.subscription_status] ?? 0) + 1

  // Trial/Premium yang berakhir dalam 3 hari ke depan — kandidat follow-up.
  const now = Date.now()
  const soon = now + 3 * 86_400_000
  const expiring = users
    .map((u) => ({ ...u, ends: u.subscription_status === 'trial' ? u.trial_ends_at : u.subscription_ends_at }))
    .filter((u) => ['trial', 'premium'].includes(u.subscription_status) && u.ends && new Date(u.ends).getTime() >= now && new Date(u.ends).getTime() <= soon)

  return {
    totalUsers: users.length,
    telegramUsers: users.filter((u) => u.telegram_chat_id).length,
    totalTransactions: totalTransactions ?? 0,
    byStatus,
    mrr: (byStatus.premium ?? 0) * settings.premiumPrice,
    revenueThisMonth: (paidThisMonth ?? []).reduce((a, p) => a + p.amount, 0),
    recentUsers: users.slice(0, 6),
    expiring,
    settings,
  }
}

export default async function AdminPage() {
  const s = await getStats()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" subtitle="Ringkasan data Catetin Duit" />

      {!s.settings.tableReady && (
        <div className="rounded-[14px] border border-[#F2DDB0] bg-[#FFF8EB] px-[18px] py-3.5 text-sm text-[#6B5A36]">
          <strong className="text-[#6B4A0E]">Satu langkah setup:</strong> jalankan{' '}
          <code className="font-mono">supabase/migrations/20260928_app_settings.sql</code> di Supabase SQL Editor supaya
          Pengaturan & status cron bisa disimpan.
        </div>
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <StatCard label="TOTAL USER" value={s.totalUsers} note={`${s.telegramUsers} terhubung Telegram`} />
        <StatCard label="PREMIUM AKTIF" value={s.byStatus.premium ?? 0} note={`Est. MRR ${formatIDR(s.mrr)}`} />
        <StatCard label="PENDAPATAN BULAN INI" value={formatIDR(s.revenueThisMonth)} note={<Link href="/admin/payments" className="text-cd-primary">Lihat pembayaran →</Link>} tone="dark" />
        <StatCard label="TRANSAKSI" value={s.totalTransactions.toLocaleString('id-ID')} note={`Promo: ${isPromoActive(s.settings) ? 'aktif' : 'tidak aktif'}`} />
      </div>

      <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <section className={`${CARD} flex flex-col gap-3 p-5`}>
          <h2 className="m-0 text-base font-bold">Distribusi status</h2>
          {Object.entries(s.byStatus).map(([status, count]) => {
            const pct = s.totalUsers ? Math.round((count / s.totalUsers) * 100) : 0
            return (
              <Link key={status} href={`/admin/users?status=${status}`} className="flex flex-col gap-1">
                <span className="flex justify-between text-sm">
                  <span className="font-semibold">{STATUS_NAMES[status] ?? status}</span>
                  <span className="text-cd-muted-2">{count} user ({pct}%)</span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-cd-bg">
                  <span className={`block h-full rounded-full ${status === 'premium' ? 'bg-cd-primary' : status === 'trial' ? 'bg-[#6C9BE8]' : 'bg-cd-line-strong'}`} style={{ width: `${pct}%` }} />
                </span>
              </Link>
            )
          })}
        </section>

        <section className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="m-0 text-base font-bold">Akan habis ≤ 3 hari</h2>
            <span className="text-[13px] text-cd-muted-2">{s.expiring.length} user</span>
          </div>
          {s.expiring.length === 0 ? (
            <p className="m-0 border-t border-cd-line-soft px-5 py-6 text-sm text-cd-muted-2">Tidak ada trial/Premium yang akan habis.</p>
          ) : s.expiring.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 border-t border-cd-line-soft px-5 py-3 hover:bg-[#FAFCFB]">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{u.full_name ?? u.email}</span>
                <StatusPill status={u.subscription_status} />
              </span>
              <span className="text-[13px]"><EndsAt iso={u.ends} /></span>
            </Link>
          ))}
        </section>

        <section className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="m-0 text-base font-bold">User terbaru</h2>
            <Link href="/admin/users" className="text-sm font-semibold text-cd-primary hover:text-cd-primary-hover">Semua →</Link>
          </div>
          {s.recentUsers.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 border-t border-cd-line-soft px-5 py-3 hover:bg-[#FAFCFB]">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-cd-tint text-xs font-bold text-cd-primary-hover">
                {(u.full_name ?? u.email ?? '?')[0].toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{u.full_name ?? u.email}</span>
                <span className="truncate text-xs text-cd-muted-2">{u.email}</span>
              </span>
              <StatusPill status={u.subscription_status} />
            </Link>
          ))}
        </section>
      </div>
    </div>
  )
}
