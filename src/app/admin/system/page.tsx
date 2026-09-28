import { subDays, format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { createAdminClient } from '@/utils/supabase/admin'
import { getSettings, isPromoActive } from '@/lib/settings'
import { formatIDR } from '@/lib/utils'
import { CARD, PageHeader } from '@/components/dashboard/ui'
import { StatCard } from '../ui'

export const dynamic = 'force-dynamic'

/** Perkiraan biaya LLM per chat (±1.600 token, diukur 28 Sep 2026 di Kenari). */
const LLM_COST_PER_CHAT = 14

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

type WebhookInfo = {
  url?: string
  pending_update_count?: number
  last_error_date?: number
  last_error_message?: string
}

async function webhookInfo(): Promise<WebhookInfo | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { cache: 'no-store' })
    const body = await res.json()
    return body?.ok ? (body.result as WebhookInfo) : null
  } catch {
    return null
  }
}

export default async function AdminSystemPage() {
  const db = createAdminClient()
  const since = subDays(new Date(), 6)
  since.setHours(0, 0, 0, 0)

  const [settings, wh, { data: tx }, { count: reviewCount }] = await Promise.all([
    getSettings(),
    webhookInfo(),
    db.from('transactions').select('user_id, dedupe_key, created_at').eq('source', 'telegram').gte('created_at', since.toISOString()),
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('needs_review', true).is('deleted_at', null),
  ])

  // Satu pesan bisa menghasilkan beberapa transaksi (dedupe_key "tg:chat:msg:i"),
  // jadi hitung pesan unik. Pesan non-finansial/gagal tidak tersimpan → ini batas bawah.
  const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'))
  const perDay = new Map(days.map((d) => [d, new Set<string>()]))
  const activeUsers = new Set<string>()
  for (const t of tx ?? []) {
    const day = new Date(t.created_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    const msg = t.dedupe_key ? t.dedupe_key.split(':').slice(0, 3).join(':') : `${t.created_at}`
    perDay.get(day)?.add(msg)
    activeUsers.add(t.user_id)
  }
  const counts = days.map((d) => ({ d, n: perDay.get(d)?.size ?? 0 }))
  const totalMsgs = counts.reduce((a, c) => a + c.n, 0)
  const max = Math.max(1, ...counts.map((c) => c.n))

  const whOk = !!wh?.url && !wh.last_error_message && (wh.pending_update_count ?? 0) < 20
  const cron = settings.cronLastRun
  const cronAgeH = cron ? (Date.now() - new Date(cron.at).getTime()) / 3_600_000 : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sistem" subtitle="Kesehatan bot, cron harian, dan pemakaian 7 hari terakhir" />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <StatCard
          label="WEBHOOK BOT"
          value={<span className={whOk ? 'text-cd-primary' : 'text-cd-expense'}>{wh ? (whOk ? 'Sehat' : 'Bermasalah') : 'Tidak terbaca'}</span>}
          note={wh ? `${wh.pending_update_count ?? 0} update antre${wh.last_error_message ? ` · error: ${wh.last_error_message}` : ''}` : 'TELEGRAM_BOT_TOKEN tidak tersedia'}
        />
        <StatCard
          label="CRON HARIAN"
          value={<span className={cron && cronAgeH! < 26 ? 'text-cd-primary' : 'text-[#8A6A1E]'}>{cron ? fmt(cron.at) : 'Belum tercatat'}</span>}
          note={cron ? `${cronAgeH! < 26 ? 'Jalan normal' : 'Lebih dari 26 jam lalu — cek Vercel Cron'}` : settings.tableReady ? 'Muncul setelah run berikutnya (±08:00 WIB)' : 'Butuh tabel app_settings'}
        />
        <StatCard label="PROMO" value={isPromoActive(settings) ? 'Aktif' : 'Tidak aktif'} note={settings.promo.until ? `sampai ${settings.promo.until}` : 'Atur di Pengaturan'} />
        <StatCard label="PERLU REVIEW" value={reviewCount ?? 0} note="transaksi ditandai needs_review" />
      </div>

      {cron && (
        <section className={`${CARD} p-5`}>
          <h2 className="m-0 mb-3 text-base font-bold">Hasil cron terakhir</h2>
          <div className="grid gap-2 text-sm [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            {Object.entries(cron.results).filter(([k]) => k !== 'errors').map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-lg bg-cd-bg px-3 py-2">
                <span className="text-cd-muted-2">{k}</span>
                <strong>{String(v)}</strong>
              </div>
            ))}
          </div>
          {Array.isArray(cron.results.errors) && cron.results.errors.length > 0 && (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-[#FDF0F0] p-3 text-xs text-[#8A1F1F]">{(cron.results.errors as string[]).join('\n')}</pre>
          )}
        </section>
      )}

      <section className={`${CARD} flex flex-col gap-4 p-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-base font-bold">Chat tercatat via Telegram (7 hari)</h2>
          <span className="text-[13px] text-cd-muted-2">
            {totalMsgs} chat · {activeUsers.size} user aktif · perkiraan biaya LLM ≥ {formatIDR(totalMsgs * LLM_COST_PER_CHAT)}
          </span>
        </div>
        <div className="flex h-40 items-end gap-3">
          {counts.map(({ d, n }) => (
            <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-cd-muted">{n}</span>
              <div className="w-full max-w-[40px] rounded-t-md bg-cd-accent" style={{ height: `${Math.max(2, (n / max) * 110)}px` }} />
              <span className="text-xs text-cd-muted-2">{format(new Date(d), 'EEE d', { locale: idLocale })}</span>
            </div>
          ))}
        </div>
        <p className="m-0 text-xs text-cd-muted-2">
          Hanya chat yang menghasilkan transaksi. Chat non-finansial (mis. &ldquo;halo&rdquo;) juga memanggil LLM, sedangkan
          perintah seperti /riwayat tidak — jadi biaya sebenarnya sedikit lebih tinggi. Angka pasti ada di dashboard Kenari → Pemakaian.
        </p>
      </section>
    </div>
  )
}
