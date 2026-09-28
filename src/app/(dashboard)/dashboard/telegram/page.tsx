import { createClient } from '@/utils/supabase/server'
import { BOT_USERNAME, CONNECT_CODE_MAX_ATTEMPTS, CONNECT_CODE_MAX_PER_HOUR } from '@/lib/constants'
import { TelegramConnect, type ConnectState } from './telegram-connect'

const EXAMPLES = [
  'Beli makan siang 35rb',
  'Terima transfer dari client 2jt',
  'Beli bensin 50rb dan dapat gofood 500rb',
]

// Harus sama dengan perintah di src/lib/telegram/handlers.ts
const COMMANDS = [
  ['/riwayat', 'Lihat transaksi terakhir'],
  ['/ringkasan', 'Ringkasan bulan ini'],
  ['/bantuan', 'Tampilkan panduan'],
] as const

const HOUR_MS = 60 * 60 * 1000

export default async function TelegramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_chat_id')
    .eq('id', user!.id)
    .single()

  const isConnected = !!profile?.telegram_chat_id

  let connect: ConnectState | null = null
  if (!isConnected) {
    // Jendela rate limit sama dengan /api/connect/generate: kode yang dibuat 1 jam terakhir.
    const now = Date.now()
    const { data: codes } = await supabase
      .from('connect_codes')
      .select('code, created_at, expires_at, used_at, attempt_count')
      .eq('user_id', user!.id)
      .gte('created_at', new Date(now - HOUR_MS).toISOString())
      .order('created_at', { ascending: false })

    const recent = codes ?? []
    const latest = recent[0]
    const remaining = Math.max(0, CONNECT_CODE_MAX_PER_HOUR - recent.length)
    // Slot baru terbuka saat kode tertua di jendela 1 jam keluar dari jendela.
    const retryAt = remaining === 0
      ? new Date(new Date(recent[recent.length - 1].created_at).getTime() + HOUR_MS).toISOString()
      : null

    const locked = !!latest && (latest.attempt_count ?? 0) >= CONNECT_CODE_MAX_ATTEMPTS
    const active = !!latest && !locked && !latest.used_at && new Date(latest.expires_at).getTime() > now

    connect = {
      active: active ? { code: latest.code, expiresAt: latest.expires_at } : null,
      locked,
      remaining,
      retryAt,
    }
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-6 text-cd-ink">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em]">Hubungkan Telegram</h1>
        <p className="m-0 text-[15px] text-cd-muted-2">Catat transaksi langsung dari chat Telegram</p>
      </div>

      {connect ? (
        <TelegramConnect userId={user!.id} initial={connect} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-cd-dark p-7 text-white">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-cd-accent shadow-[0_0_0_4px_rgba(22,176,106,.2)]" />
                <span className="text-[13px] font-bold text-cd-accent-text">Terhubung</span>
              </div>
              <h2 className="m-0 text-xl font-bold">Akun Telegram kamu sudah terhubung</h2>
              <p className="m-0 text-sm text-cd-on-dark">Kamu bisa langsung chat ke bot untuk mencatat transaksi.</p>
            </div>
            <a
              href={`https://t.me/${BOT_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-cd-accent px-[18px] py-3 text-[15px] font-bold text-cd-dark hover:bg-cd-accent-hover"
            >
              Buka Telegram
            </a>
          </div>

          <div className="grid gap-7 rounded-[20px] border border-cd-line bg-white p-7 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold">Catat transaksi</span>
              <div className="flex flex-col gap-2">
                {EXAMPLES.map((t) => (
                  <span key={t} className="self-start rounded-[14px_14px_14px_4px] bg-cd-primary px-3 py-2 text-sm text-white">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold">Perintah tersedia</span>
              <div className="flex flex-col gap-2.5 text-sm">
                {COMMANDS.map(([cmd, desc]) => (
                  <div key={cmd} className="flex items-baseline gap-2.5">
                    <code className="rounded-md bg-cd-tint px-2 py-[3px] font-mono text-[13px] text-cd-primary-hover">{cmd}</code>
                    <span className="text-cd-muted">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
