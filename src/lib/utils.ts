import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone } from "date-fns-tz"
import { VALID_TIMEZONES, type ValidTimezone } from "@/lib/constants"

/** Merge Tailwind class names, resolving conflicts correctly. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

/**
 * Format a number as Indonesian Rupiah (IDR).
 * @example formatIDR(29000) → "Rp 29.000"
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number as compact IDR notation (for chart axes).
 * @example formatIDRCompact(1500000) → "Rp 1,5 jt"
 */
export function formatIDRCompact(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(amount)
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Format a date string in a given timezone using date-fns-tz.
 * @param dateStr - ISO date string
 * @param timezone - IANA timezone string (e.g. "Asia/Jakarta")
 * @param fmt - date-fns format string (default: "dd MMM yyyy")
 */
export function formatDate(
  dateStr: string,
  timezone: string,
  fmt = "dd MMM yyyy"
): string {
  return formatInTimeZone(new Date(dateStr), timezone, fmt)
}

/**
 * Format a date string as short month-day (e.g. "12 Jan").
 */
export function formatDateShort(dateStr: string, timezone: string): string {
  return formatDate(dateStr, timezone, "dd MMM")
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/**
 * Safely parse a URL search param as a positive page number.
 * Handles NaN, negative numbers, zero, and undefined gracefully.
 * @example parsePageParam("abc") → 1, parsePageParam("0") → 1, parsePageParam("3") → 3
 */
export function parsePageParam(raw: string | undefined): number {
  return Math.max(1, Number(raw) || 1)
}

// ─── Timezone Validation ──────────────────────────────────────────────────────

/**
 * Runtime type guard: returns true if the given string is a supported Indonesian timezone.
 */
export function isValidTimezone(tz: string): tz is ValidTimezone {
  return (VALID_TIMEZONES as readonly string[]).includes(tz)
}
