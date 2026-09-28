import { createClient } from '@/utils/supabase/server'
import { Check, MessageCircle } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { id as idLocale } from 'date-fns/locale'
import { formatIDR } from '@/lib/utils'
import { FREE_PROMO, SUBSCRIPTION_PRICE, TRIAL_DURATION_DAYS } from '@/lib/constants'
import { PageHeader } from '@/components/dashboard/ui'

const WA_NUMBER = '6281329064923'

const TRIAL_ITEMS = ['Catat transaksi via Telegram', 'Dashboard web & grafik cashflow', 'Kategorisasi otomatis oleh AI']
const PREMIUM_ITEMS = ['Semua fitur Trial', 'Pencatatan tanpa batas', 'Prioritas support']

function buildWaLink(): string {
  const msg = `Halo CatetinDuit, aku mau berlangganan Premium (${formatIDR(SUBSCRIPTION_PRICE)}/bulan). Boleh dibantu proses pembayarannya?`
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

function Items({ items }: { items: string[] }) {
  return (
    <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 p-0 text-sm">
      {items.map((f) => (
        <li key={f} className="flex gap-2.5">
          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-cd-success" strokeWidth={3} />
          {f}
        </li>
      ))}
    </ul>
  )
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
  const fmt      = (iso: string | null | undefined) =>
    iso ? formatInTimeZone(new Date(iso), timezone, 'd MMMM yyyy', { locale: idLocale }) : '-'

  // Paket yang sedang berlaku untuk user ini
  const isPremium = FREE_PROMO || status === 'premium' || status === 'grace_period'
  const isTrial   = !isPremium && status === 'trial'
  const isExpired = !isPremium && !isTrial

  const current = isPremium
    ? {
        name: 'Premium',
        desc: FREE_PROMO
          ? 'Gratis selama masa promo — semua fitur Premium terbuka tanpa batas waktu'
          : status === 'grace_period'
            ? 'Masa tenggang — segera perpanjang supaya pencatatan tetap jalan'
            : `Aktif hingga ${fmt(profile?.subscription_ends_at)}`,
        pill: 'Aktif',
      }
    : isTrial
      ? { name: 'Trial', desc: `Trial gratis berakhir ${fmt(profile?.trial_ends_at)}`, pill: 'Aktif' }
      : {
          name: status === 'cancelled' ? 'Langganan berakhir' : 'Trial berakhir',
          desc: status === 'cancelled'
            ? 'Premium kamu sudah berakhir. Perpanjang untuk lanjut mencatat via Telegram. Datamu tetap aman dan bisa dilihat.'
            : 'Upgrade ke Premium untuk lanjut mencatat via Telegram. Datamu tetap aman dan bisa dilihat.',
          pill: 'Berakhir',
        }

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <PageHeader title="Langganan" subtitle="Pilih plan yang sesuai kebutuhanmu" />

      {/* Plan saat ini */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-cd-dark px-6 py-[22px] text-white">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-[.07em] text-cd-on-dark-3">PLAN KAMU SAAT INI</span>
          <span className="text-xl font-extrabold">{current.name}</span>
          <span className="text-sm text-cd-on-dark">{current.desc}</span>
        </div>
        <span
          className={
            isExpired
              ? 'rounded-full bg-[#FDF0F0] px-2.5 py-[5px] text-xs font-bold text-[#8A1F1F]'
              : 'rounded-full bg-cd-accent px-2.5 py-[5px] text-xs font-bold text-cd-dark'
          }
        >
          {current.pill}
        </span>
      </div>

      <div className="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {/* Trial */}
        <div
          className={`flex flex-col gap-5 rounded-[20px] bg-white ${
            isTrial ? 'border-2 border-cd-primary p-[25px]' : 'border border-cd-line p-[26px]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[17px] font-bold">Trial</span>
              <span className="text-sm text-cd-muted-2">Coba semua fitur gratis</span>
            </div>
            {isTrial && <span className="rounded-full bg-cd-tint px-[9px] py-1 text-xs font-bold text-cd-primary-hover">Plan kamu</span>}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-extrabold tracking-[-.03em]">Gratis</span>
            <span className="text-sm text-cd-muted-2">/ {TRIAL_DURATION_DAYS} hari</span>
          </div>
          <Items items={TRIAL_ITEMS} />
          {isTrial ? (
            <span className="rounded-xl bg-cd-tint p-3 text-center text-sm font-bold text-cd-primary-hover">Sedang berjalan</span>
          ) : (
            <span className="rounded-xl bg-cd-bg p-3 text-center text-sm font-semibold text-cd-placeholder">Sudah lewat</span>
          )}
        </div>

        {/* Premium */}
        <div
          className={`flex flex-col gap-5 rounded-[20px] bg-white ${
            isPremium ? 'border-2 border-cd-primary p-[25px]' : 'border border-cd-line p-[26px]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[17px] font-bold">Premium</span>
              <span className="text-sm text-cd-muted-2">Akses penuh tanpa batas</span>
            </div>
            {isPremium && <span className="rounded-full bg-cd-tint px-[9px] py-1 text-xs font-bold text-cd-primary-hover">Plan kamu</span>}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[34px] font-extrabold tracking-[-.03em]">{formatIDR(SUBSCRIPTION_PRICE)}</span>
            <span className="text-sm text-cd-muted-2">/ bulan</span>
          </div>
          <Items items={PREMIUM_ITEMS} />
          {isPremium ? (
            <span className="rounded-xl bg-cd-tint p-3 text-center text-sm font-bold text-cd-primary-hover">Plan Aktif</span>
          ) : (
            <a
              href={buildWaLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-cd-primary p-3 text-sm font-bold text-white hover:bg-cd-primary-hover"
            >
              <MessageCircle className="h-4 w-4" />
              {status === 'cancelled' ? 'Perpanjang via WhatsApp' : 'Upgrade via WhatsApp'}
            </a>
          )}
        </div>
      </div>

      {!isPremium && (
        <p className="m-0 text-[13px] text-cd-muted-2">
          Pembayaran saat ini diproses lewat WhatsApp. Tim kami membantu pembayaran dan mengaktifkan Premium di akunmu.
        </p>
      )}
    </div>
  )
}
