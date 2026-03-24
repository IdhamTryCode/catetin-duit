/**
 * Application-wide constants.
 * Centralizes all magic values to avoid duplication and ease configuration.
 */

// ─── Plans & Pricing ──────────────────────────────────────────────────────────

/** Valid plan identifiers */
export const PLANS = ['free', 'starter', 'premium'] as const
export type Plan = (typeof PLANS)[number]

/** Monthly price per plan in IDR (free = 0) */
export const PLAN_PRICES: Record<Plan, number> = {
  free:    0,
  starter: 14_999,
  premium: 39_999,
}

/** Per-plan feature limits. Use Infinity for unlimited. */
export const PLAN_LIMITS: Record<Plan, {
  dailyTransactions: number
  historyDays: number
  customCategories: number
}> = {
  free:    { dailyTransactions: 5,        historyDays: 30,       customCategories: 0        },
  starter: { dailyTransactions: 20,       historyDays: 180,      customCategories: 5        },
  premium: { dailyTransactions: Infinity, historyDays: Infinity, customCategories: Infinity },
}

/** Display config for each plan — used in header badge & subscription page */
export const PLAN_BADGE: Record<Plan, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: boolean
}> = {
  free:    { label: 'Free',        variant: 'secondary', icon: false },
  starter: { label: '✦ Starter',   variant: 'outline',   icon: false },
  premium: { label: '✦ Premium',   variant: 'default',   icon: true  },
}

/** Human-readable plan names */
export const PLAN_NAMES: Record<Plan, string> = {
  free:    'Free',
  starter: 'Starter',
  premium: 'Premium',
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

// ─── Legacy: kept for backward-compat during transition ───────────────────────
/** @deprecated Use PLAN_BADGE keyed by profile.plan instead */
export const SUBSCRIPTION_PRICE = 14_999
