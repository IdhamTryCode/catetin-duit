/**
 * Application-wide constants.
 * Centralizes all magic values to avoid duplication and ease configuration.
 */

// ─── Subscription & Pricing ──────────────────────────────────────────────────

/** Monthly subscription price in IDR */
export const SUBSCRIPTION_PRICE = 29_000

/** Duration of a premium subscription in days */
export const SUBSCRIPTION_DURATION_DAYS = 30

/** Duration of the free trial in days */
export const TRIAL_DURATION_DAYS = 7

/** Days before trial ends to send reminder emails (H-3 and H-1) */
export const TRIAL_REMINDER_DAYS = [3, 1] as const

/** Days before premium ends to send reminder emails (H-3 and H-1) */
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

// ─── Subscription Status Badge Config (used in Header) ────────────────────────

/** Badge variant config for each subscription status — used in the header badge */
export const SUBSCRIPTION_STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  trial: { label: 'Trial', variant: 'secondary' },
  premium: { label: '✦ Premium', variant: 'default' },
  trial_expired: { label: 'Expired', variant: 'destructive' },
  grace_period: { label: 'Grace', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}
