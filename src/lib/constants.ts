/**
 * Application-wide constants.
 * Centralizes all magic values to avoid duplication and ease configuration.
 */

// ─── Plans & Pricing ──────────────────────────────────────────────────────────
// Model harga: Trial 7 hari (akses penuh) → Premium Rp 14.999/bulan.
// Sumber kebenaran akses adalah `profiles.subscription_status` (dipakai juga
// oleh bot, cron trial, dan webhook Duitku). Kolom `profiles.plan` lama tidak
// dipakai lagi. `Plan` di sini adalah tier akses efektif hasil resolvePlan().

/** Tier akses efektif: 'premium' = penuh (trial/premium aktif), 'free' = terbatas. */
export const PLANS = ['free', 'premium'] as const
export type Plan = (typeof PLANS)[number]

/** Harga bulanan per tier dalam IDR */
export const PLAN_PRICES: Record<Plan, number> = {
  free:    0,
  premium: 14_999,
}

/** Batas fitur per tier. Infinity = tanpa batas. */
export const PLAN_LIMITS: Record<Plan, {
  dailyTransactions: number
  historyDays: number
  customCategories: number
}> = {
  free:    { dailyTransactions: 5,        historyDays: 30,       customCategories: 0        },
  premium: { dailyTransactions: Infinity, historyDays: Infinity, customCategories: Infinity },
}

/** Status langganan yang mendapat akses penuh. */
export const FULL_ACCESS_STATUSES = ['trial', 'premium', 'grace_period'] as const

// ─── Promo: "semua gratis" (sementara) ────────────────────────────────────────
// Saklar promosi. Saat ON, SEMUA user diperlakukan sebagai PROMO_PLAN tanpa
// batas waktu, dan blokir trial-expired dimatikan. Data user TIDAK diubah —
// matikan flag = langsung balik ke alur berbayar normal.
// Aktifkan dengan env: NEXT_PUBLIC_FREE_PROMO=true  (set di Vercel & .env lokal)
export const FREE_PROMO = process.env.NEXT_PUBLIC_FREE_PROMO === 'true'

/** Tier yang diberikan ke semua user selama promo aktif. */
export const PROMO_PLAN: Plan = 'premium'

/** Tier akses efektif dari subscription_status (promo → PROMO_PLAN). */
export function resolvePlan(status: string | null | undefined): Plan {
  if (FREE_PROMO) return PROMO_PLAN
  return (FULL_ACCESS_STATUSES as readonly string[]).includes(status ?? '') ? 'premium' : 'free'
}

/** Label badge status langganan (header & halaman Langganan). */
export function statusBadge(status: string | null | undefined): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: boolean
} {
  if (FREE_PROMO) return { label: '✦ Premium', variant: 'default', icon: true }
  switch (status) {
    case 'premium':      return { label: '✦ Premium',      variant: 'default',     icon: true  }
    case 'grace_period': return { label: 'Masa tenggang',  variant: 'outline',     icon: false }
    case 'trial':        return { label: 'Trial',          variant: 'secondary',   icon: false }
    case 'cancelled':    return { label: 'Nonaktif',       variant: 'destructive', icon: false }
    default:             return { label: 'Trial berakhir', variant: 'destructive', icon: false }
  }
}

/** Nama status langganan untuk admin. */
export const STATUS_NAMES: Record<string, string> = {
  trial:         'Trial',
  premium:       'Premium',
  trial_expired: 'Trial berakhir',
  grace_period:  'Masa tenggang',
  cancelled:     'Nonaktif',
}

// ─── Subscription lifecycle ───────────────────────────────────────────────────

/** Duration of a paid subscription in days */
export const SUBSCRIPTION_DURATION_DAYS = 30

/** Duration of the free trial period in days */
export const TRIAL_DURATION_DAYS = 7

/** Days before trial ends to send reminder emails (H-3 and H-1) */
export const TRIAL_REMINDER_DAYS = [3, 1] as const

/** Days before subscription ends to send reminder emails */
export const PREMIUM_REMINDER_DAYS = [3, 1] as const

/** Show trial expiry alert on dashboard when days remaining ≤ this value */
export const TRIAL_WARNING_THRESHOLD_DAYS = 3

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Default number of items per page for paginated lists */
export const PAGE_SIZE = 20

// ─── Payment Gateway ──────────────────────────────────────────────────────────

/** Duitku invoice expiry duration in minutes (24 hours) */
export const PAYMENT_EXPIRY_MINUTES = 1440

// ─── Telegram Bot ─────────────────────────────────────────────────────────────

/** Telegram bot username (without @) */
export const BOT_USERNAME = 'CatetinDuitDe_bot'

/** Masa berlaku kode /connect (menit) — dipakai /api/connect/generate */
export const CONNECT_CODE_TTL_MINUTES = 15

/** Maksimal kode /connect yang boleh dibuat per user dalam 1 jam */
export const CONNECT_CODE_MAX_PER_HOUR = 3

/**
 * Kode terkunci setelah sekian percobaan gagal. Harus sama dengan batas di
 * handleConnect (src/lib/telegram/handlers.ts); hanya dipakai untuk tampilan.
 */
export const CONNECT_CODE_MAX_ATTEMPTS = 5

// ─── Timezones ────────────────────────────────────────────────────────────────

/** Supported Indonesian timezones with display labels */
export const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB — Waktu Indonesia Barat (UTC+7)' },
  { value: 'Asia/Makassar', label: 'WITA — Waktu Indonesia Tengah (UTC+8)' },
  { value: 'Asia/Jayapura', label: 'WIT — Waktu Indonesia Timur (UTC+9)' },
] as const

/** Tuple of valid timezone strings for runtime validation and Zod schemas */
export const VALID_TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] as const

/** Union type of valid timezone strings */
export type ValidTimezone = (typeof VALID_TIMEZONES)[number]

/** Fallback timezone when none is set */
export const DEFAULT_TIMEZONE: ValidTimezone = 'Asia/Jakarta'

/** Harga Premium per bulan (dipakai pembayaran & landing) */
export const SUBSCRIPTION_PRICE = PLAN_PRICES.premium
