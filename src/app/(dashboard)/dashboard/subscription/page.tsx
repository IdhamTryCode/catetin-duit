import { createClient } from '@/utils/supabase/server'
import { Check, MessageCircle } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { formatIDR } from '@/lib/utils'
import { FREE_PROMO, SUBSCRIPTION_PRICE, TRIAL_DURATION_DAYS, statusBadge } from '@/lib/constants'
import { PREMIUM_EXTRA, TRIAL_FEATURES } from '@/lib/pricing'

const WA_NUMBER = '6281329064923'

function buildWaLink(): string {
  const msg = `Halo CatetinDuit, aku mau berlangganan Premium (${formatIDR(SUBSCRIPTION_PRICE)}/bulan). Boleh dibantu proses pembayarannya?`
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function SubscriptionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, subscription_ends_at, timezone')
    .eq('id', user!.id)
    .single()

  const timezone = profile?.timezone ?? 'Asia/Jakarta'
  const status   = profile?.subscription_status ?? 'trial'
  const badge    = statusBadge(status)
  const fmt      = (iso: string | null | undefined) =>
    iso ? formatInTimeZone(new Date(iso), timezone, 'dd MMM yyyy') : '-'

  const statusLabel: Record<string, string> = {
    trial:         `Trial berakhir ${fmt(profile?.trial_ends_at)}`,
    premium:       `Aktif hingga ${fmt(profile?.subscription_ends_at)}`,
    trial_expired: 'Trial sudah berakhir. Upgrade ke Premium untuk lanjut mencatat via Telegram.',
    grace_period:  'Masa tenggang — segera perpanjang',
    cancelled:     'Langganan dibatalkan',
  }

  const isPremium = status === 'premium' || status === 'grace_period'

  return (
    <div className="flex max-w-[880px] flex-col gap-6 text-cd-ink">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em]">Langganan</h1>
        <p className="m-0 text-[15px] text-cd-muted-2">Mulai gratis, upgrade kapan saja.</p>
      </div>

      {/* Status saat ini */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-cd-line bg-white px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-cd-muted-2">Status kamu saat ini</span>
          <span className="text-[15px]">
            {FREE_PROMO
              ? 'Gratis selama masa promo — semua fitur Premium terbuka tanpa batas waktu.'
              : statusLabel[status] ?? ''}
          </span>
        </div>
        <span
          className={
            badge.variant === 'destructive'
              ? 'rounded-full border border-[#F0C8C8] bg-[#FDF0F0] px-3 py-1 text-[13px] font-bold text-[#8A1F1F]'
              : 'rounded-full bg-cd-tint px-3 py-1 text-[13px] font-bold text-cd-primary-hover'
          }
        >
          {badge.label}
        </span>
      </div>

      {!FREE_PROMO && !isPremium && (
        <div className="rounded-[14px] bg-cd-tint px-[18px] py-3.5 text-sm leading-[1.55] text-cd-ink-2">
          Pembayaran saat ini diproses lewat WhatsApp. Tim kami akan membantu pembayaran dan mengaktifkan Premium di akunmu.
        </div>
      )}

      <div className="grid items-stretch gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
        {/* Trial */}
        <div className="flex flex-col gap-6 rounded-3xl border border-cd-line bg-cd-bg p-8">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold">Trial</span>
            <span className="text-sm text-cd-muted-2">Coba semua fitur gratis</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[40px] font-extrabold tracking-[-.03em]">Gratis</span>
            <span className="text-[15px] text-cd-muted-2">/ {TRIAL_DURATION_DAYS} hari</span>
          </div>
          <ul className="m-0 flex flex-1 list-none flex-col gap-3 p-0 text-[15px]">
            {TRIAL_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cd-success" strokeWidth={3} />
                {f}
              </li>
            ))}
          </ul>
          {status === 'trial' && !FREE_PROMO && (
            <span className="rounded-xl border border-cd-line-strong bg-white p-3.5 text-center text-[15px] font-bold text-cd-muted-2">
              Sedang aktif
            </span>
          )}
        </div>

        {/* Premium */}
        <div className="relative flex flex-col gap-6 rounded-3xl bg-cd-dark p-8 text-white shadow-[0_30px_60px_-30px_rgba(6,20,13,.6)]">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold">Premium</span>
            <span className="text-sm text-cd-on-dark-2">Akses penuh tanpa batas</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[40px] font-extrabold tracking-[-.03em]">{formatIDR(SUBSCRIPTION_PRICE)}</span>
            <span className="text-[15px] text-cd-on-dark-2">/ bulan</span>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <span className="text-sm text-cd-on-dark-2">Semua fitur Trial tetap aktif, ditambah:</span>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[15px]">
              {PREMIUM_EXTRA.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cd-accent-text" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {FREE_PROMO ? (
            <span className="rounded-xl border border-cd-dark-line p-3.5 text-center text-[15px] font-bold text-cd-on-dark">
              Gratis selama promo
            </span>
          ) : isPremium ? (
            <span className="rounded-xl border border-cd-dark-line p-3.5 text-center text-[15px] font-bold text-cd-accent-text">
              Premium aktif hingga {fmt(profile?.subscription_ends_at)}
            </span>
          ) : (
            <a
              href={buildWaLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-cd-accent p-3.5 text-[15px] font-bold text-cd-dark hover:bg-cd-accent-hover"
            >
              <MessageCircle className="h-4 w-4" />
              Upgrade via WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
