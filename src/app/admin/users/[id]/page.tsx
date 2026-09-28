import Link from 'next/link'
import { notFound } from 'next/navigation'
import { startOfMonth } from 'date-fns'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { formatIDR } from '@/lib/utils'
import { CONNECT_CODE_MAX_ATTEMPTS } from '@/lib/constants'
import { getSettings } from '@/lib/settings'
import { CARD, PageHeader } from '@/components/dashboard/ui'
import { EndsAt, StatusPill } from '../../ui'
import { UserActions } from './user-actions'

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

const ACTION_LABEL: Record<string, string> = {
  'admin.set_status': 'Ubah status',
  'admin.set_role': 'Ubah role',
  'admin.extend_trial': 'Perpanjang trial',
  'admin.set_premium_until': 'Set Premium sampai',
  'admin.record_payment': 'Catat pembayaran',
  'admin.disconnect_telegram': 'Putuskan Telegram',
  'admin.reset_connect_codes': 'Reset kode connect',
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  const db = createAdminClient()

  const { data: user } = await db
    .from('profiles')
    .select('id, email, full_name, role, timezone, subscription_status, trial_ends_at, subscription_started_at, subscription_ends_at, telegram_chat_id, created_at')
    .eq('id', params.id)
    .single()
  if (!user) notFound()

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [txAll, txMonth, txTelegram, lastTx, codes, payments, logs, settings] = await Promise.all([
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null)
      .gte('created_at', startOfMonth(new Date()).toISOString()),
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null).eq('source', 'telegram'),
    db.from('transactions').select('created_at, description').eq('user_id', user.id).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(1),
    db.from('connect_codes').select('created_at, attempt_count, used_at').eq('user_id', user.id).gte('created_at', hourAgo),
    db.from('payments').select('id, amount, status, payment_method, paid_at, created_at, merchant_order_id').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20),
    db.from('audit_logs').select('id, action, user_id, old_values, new_values, created_at').eq('record_id', user.id)
      .order('created_at', { ascending: false }).limit(20),
    getSettings(),
  ])

  const codeRows = codes.data ?? []
  const locked = codeRows.some((c) => (c.attempt_count ?? 0) >= CONNECT_CODE_MAX_ATTEMPTS)

  // Nama admin pelaku di riwayat aksi
  const adminIds = Array.from(new Set((logs.data ?? []).map((l) => l.user_id).filter(Boolean))) as string[]
  const { data: admins } = adminIds.length
    ? await db.from('profiles').select('id, full_name, email').in('id', adminIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] }
  const adminName = (id: string | null) => {
    const a = admins?.find((x) => x.id === id)
    return a?.full_name ?? a?.email ?? '—'
  }

  const endsIso = user.subscription_status === 'trial' ? user.trial_ends_at : user.subscription_ends_at

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users" className="text-sm font-semibold text-cd-primary hover:text-cd-primary-hover">← Semua user</Link>
      <PageHeader
        title={user.full_name ?? user.email}
        subtitle={<span className="flex flex-wrap items-center gap-2">{user.email} <StatusPill status={user.subscription_status} />{user.role === 'admin' && <span className="rounded-full bg-cd-dark px-2 py-0.5 text-[11px] font-bold text-cd-accent-text">Admin</span>}</span>}
      />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Info label="Langganan berakhir"><EndsAt iso={endsIso} /></Info>
        <Info label="Trial berakhir"><EndsAt iso={user.trial_ends_at} /></Info>
        <Info label="Transaksi">
          <span>{txAll.count ?? 0} total · {txMonth.count ?? 0} bulan ini</span>
          <span className="text-[11px] text-cd-muted-2">{txTelegram.count ?? 0} via Telegram</span>
        </Info>
        <Info label="Aktivitas terakhir">
          {lastTx.data?.[0] ? (
            <>
              <span>{fmtDateTime(lastTx.data[0].created_at)}</span>
              <span className="truncate text-[11px] text-cd-muted-2">{lastTx.data[0].description ?? '—'}</span>
            </>
          ) : <span className="text-cd-placeholder">Belum ada transaksi</span>}
        </Info>
        <Info label="Telegram">
          {user.telegram_chat_id ? <span className="font-semibold text-cd-success">● Terhubung</span> : <span className="text-cd-muted-2">Belum terhubung</span>}
          <span className="text-[11px] text-cd-muted-2">{codeRows.length} kode dibuat 1 jam terakhir{locked ? ' · ada kode terkunci' : ''}</span>
        </Info>
        <Info label="Bergabung">
          <span>{fmtDateTime(user.created_at)}</span>
          <span className="text-[11px] text-cd-muted-2">Zona {user.timezone}</span>
        </Info>
      </div>

      <UserActions
        user={{
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.subscription_status,
          telegramConnected: !!user.telegram_chat_id,
        }}
        isSelf={me?.id === user.id}
        premiumPrice={settings.premiumPrice}
      />

      <section className={`${CARD} overflow-x-auto`}>
        <div className="px-5 py-4 text-base font-bold">Riwayat pembayaran</div>
        {(payments.data ?? []).length === 0 ? (
          <p className="m-0 border-t border-cd-line-soft px-5 py-6 text-sm text-cd-muted-2">Belum ada pembayaran tercatat.</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {payments.data!.map((p) => (
                <tr key={p.id} className="border-t border-cd-line-soft">
                  <td className="px-5 py-3">{fmtDateTime(p.paid_at ?? p.created_at)}</td>
                  <td className="px-3 py-3 font-bold">{formatIDR(p.amount)}</td>
                  <td className="px-3 py-3">{p.payment_method ?? '—'}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-cd-bg px-2 py-0.5 text-[11px] font-bold">{p.status}</span></td>
                  <td className="px-5 py-3 text-xs text-cd-muted-2">{p.merchant_order_id.startsWith('MANUAL_') ? 'Manual' : 'Duitku'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${CARD} overflow-x-auto`}>
        <div className="px-5 py-4 text-base font-bold">Riwayat aksi admin</div>
        {(logs.data ?? []).length === 0 ? (
          <p className="m-0 border-t border-cd-line-soft px-5 py-6 text-sm text-cd-muted-2">Belum ada aksi admin untuk user ini.</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {logs.data!.map((l) => (
                <tr key={l.id} className="border-t border-cd-line-soft align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-[13px] text-cd-muted-2">{fmtDateTime(l.created_at)}</td>
                  <td className="px-3 py-3 font-semibold">{ACTION_LABEL[l.action] ?? l.action}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-cd-muted">{JSON.stringify(l.new_values)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[13px] text-cd-muted-2">oleh {adminName(l.user_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={`${CARD} flex min-w-0 flex-col gap-1 p-4 text-sm`}>
      <span className="text-xs font-bold tracking-[.05em] text-cd-muted-2">{label.toUpperCase()}</span>
      {children}
    </div>
  )
}
