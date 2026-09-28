import Link from 'next/link'
import { startOfMonth } from 'date-fns'
import { createAdminClient } from '@/utils/supabase/admin'
import { formatIDR } from '@/lib/utils'
import { CARD, PageHeader } from '@/components/dashboard/ui'
import { StatCard } from '../ui'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

const ACTION_LABEL: Record<string, string> = {
  'admin.set_status': 'Ubah status',
  'admin.set_role': 'Ubah role',
  'admin.extend_trial': 'Perpanjang trial',
  'admin.set_premium_until': 'Set Premium sampai',
  'admin.record_payment': 'Catat pembayaran',
  'admin.disconnect_telegram': 'Putuskan Telegram',
  'admin.reset_connect_codes': 'Reset kode connect',
  'admin.update_settings': 'Ubah pengaturan',
  'admin.broadcast': 'Broadcast',
}

export default async function AdminPaymentsPage() {
  const db = createAdminClient()
  const [{ data: payments }, { data: logs }] = await Promise.all([
    db.from('payments').select('id, user_id, amount, status, payment_method, paid_at, created_at, merchant_order_id, raw_webhook_payload')
      .order('created_at', { ascending: false }).limit(100),
    db.from('audit_logs').select('id, action, user_id, record_id, table_name, new_values, created_at')
      .like('action', 'admin.%').order('created_at', { ascending: false }).limit(50),
  ])

  const ids = Array.from(new Set([
    ...(payments ?? []).map((p) => p.user_id),
    ...(logs ?? []).flatMap((l) => [l.user_id, l.table_name === 'profiles' ? l.record_id : null]),
  ].filter(Boolean))) as string[]
  const { data: people } = ids.length
    ? await db.from('profiles').select('id, full_name, email').in('id', ids)
    : { data: [] as { id: string; full_name: string | null; email: string }[] }
  const who = (id: string | null) => {
    const p = people?.find((x) => x.id === id)
    return p?.full_name ?? p?.email ?? '—'
  }

  const paid = (payments ?? []).filter((p) => p.status === 'paid')
  const monthStart = startOfMonth(new Date()).getTime()
  const thisMonth = paid.filter((p) => new Date(p.paid_at ?? p.created_at).getTime() >= monthStart)
  const sum = (rows: typeof paid) => rows.reduce((a, p) => a + p.amount, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pembayaran" subtitle="Pembayaran tercatat dan riwayat aksi admin" />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <StatCard label="PENDAPATAN BULAN INI" value={formatIDR(sum(thisMonth))} note={`${thisMonth.length} pembayaran`} tone="dark" />
        <StatCard label="TOTAL TERCATAT" value={formatIDR(sum(paid))} note={`${paid.length} pembayaran lunas`} />
      </div>

      <section className={`${CARD} overflow-x-auto`}>
        <div className="px-5 py-4 text-base font-bold">Pembayaran</div>
        {paid.length === 0 && (payments ?? []).length === 0 ? (
          <p className="m-0 border-t border-cd-line-soft px-5 py-6 text-sm text-cd-muted-2">
            Belum ada pembayaran. Catat pembayaran manual dari halaman detail user (Users → Kelola).
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-t border-cd-line-soft text-left text-xs text-cd-muted-2">
                <th className="px-5 py-2.5 font-semibold">Tanggal</th>
                <th className="px-3 py-2.5 font-semibold">User</th>
                <th className="px-3 py-2.5 font-semibold">Nominal</th>
                <th className="px-3 py-2.5 font-semibold">Metode</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => {
                const meta = (p.raw_webhook_payload ?? {}) as { note?: string | null; months?: number }
                return (
                  <tr key={p.id} className="border-t border-cd-line-soft">
                    <td className="whitespace-nowrap px-5 py-3 text-[13px]">{fmt(p.paid_at ?? p.created_at)}</td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/users/${p.user_id}`} className="font-semibold text-cd-primary hover:text-cd-primary-hover">{who(p.user_id)}</Link>
                    </td>
                    <td className="px-3 py-3 font-bold">{formatIDR(p.amount)}</td>
                    <td className="px-3 py-3">{p.payment_method ?? '—'}</td>
                    <td className="px-3 py-3"><span className="rounded-full bg-cd-bg px-2 py-0.5 text-[11px] font-bold">{p.status}</span></td>
                    <td className="px-5 py-3 text-[13px] text-cd-muted-2">
                      {p.merchant_order_id.startsWith('MANUAL_') ? `Manual${meta.months ? ` · ${meta.months} bln` : ''}` : 'Duitku'}
                      {meta.note ? ` · ${meta.note}` : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${CARD} overflow-x-auto`}>
        <div className="px-5 py-4 text-base font-bold">Riwayat aksi admin</div>
        {(logs ?? []).length === 0 ? (
          <p className="m-0 border-t border-cd-line-soft px-5 py-6 text-sm text-cd-muted-2">Belum ada aksi admin tercatat.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <tbody>
              {logs!.map((l) => (
                <tr key={l.id} className="border-t border-cd-line-soft align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-[13px] text-cd-muted-2">{fmt(l.created_at)}</td>
                  <td className="px-3 py-3 font-semibold">{ACTION_LABEL[l.action] ?? l.action}</td>
                  <td className="px-3 py-3">
                    {l.table_name === 'profiles' ? (
                      <Link href={`/admin/users/${l.record_id}`} className="text-cd-primary hover:text-cd-primary-hover">{who(l.record_id)}</Link>
                    ) : <span className="text-cd-muted-2">{l.table_name}</span>}
                  </td>
                  <td className="max-w-[320px] truncate px-3 py-3 font-mono text-[11px] text-cd-muted" title={JSON.stringify(l.new_values)}>
                    {JSON.stringify(l.new_values)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-[13px] text-cd-muted-2">oleh {who(l.user_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
