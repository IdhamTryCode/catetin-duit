// Hanya untuk kode server (memakai service role).
import { cache } from 'react'
import { createAdminClient } from '@/utils/supabase/admin'
import { FREE_PROMO, GRACE_PERIOD_DAYS, SUBSCRIPTION_PRICE } from '@/lib/constants'

/**
 * Pengaturan yang bisa diubah admin dari web (tabel `app_settings`).
 * Kalau tabel/baris belum ada, nilai default diambil dari env & constants,
 * jadi aplikasi tetap berjalan sebelum migrasi 20260928_app_settings.sql dijalankan.
 */
export interface AppSettings {
  promo: { enabled: boolean; until: string | null }
  premiumPrice: number
  graceDays: number
  cronLastRun: { at: string; results: Record<string, unknown> } | null
  /** false jika tabel app_settings belum ada (migrasi belum dijalankan) */
  tableReady: boolean
}

const DEFAULTS: AppSettings = {
  promo: { enabled: FREE_PROMO, until: null },
  premiumPrice: SUBSCRIPTION_PRICE,
  graceDays: GRACE_PERIOD_DAYS,
  cronLastRun: null,
  tableReady: false,
}

// Cache per instance: landing & setiap halaman membaca pengaturan, jadi tanpa ini
// banjir kunjungan = banjir query ke database. Perubahan dari admin terlihat
// paling lambat SETTINGS_TTL_MS kemudian di instance lain.
const SETTINGS_TTL_MS = 30_000
let memo: { at: number; value: AppSettings } | null = null

async function load(): Promise<AppSettings> {
  if (memo && Date.now() - memo.at < SETTINGS_TTL_MS) return memo.value
  const value = await loadFresh()
  memo = { at: Date.now(), value }
  return value
}

async function loadFresh(): Promise<AppSettings> {
  try {
    const { data, error } = await createAdminClient().from('app_settings' as never).select('key, value')
    if (error) return DEFAULTS
    const map = new Map((data as { key: string; value: unknown }[]).map((r) => [r.key, r.value]))
    const promo = map.get('promo') as AppSettings['promo'] | undefined
    const price = Number(map.get('premium_price'))
    const grace = Number(map.get('grace_days'))
    return {
      promo: promo ? { enabled: !!promo.enabled, until: promo.until ?? null } : DEFAULTS.promo,
      premiumPrice: price > 0 ? price : DEFAULTS.premiumPrice,
      graceDays: grace >= 0 && map.has('grace_days') ? grace : DEFAULTS.graceDays,
      cronLastRun: (map.get('cron_last_run') as AppSettings['cronLastRun']) ?? null,
      tableReady: true,
    }
  } catch {
    return DEFAULTS
  }
}

/** Dibaca sekali per request (React cache). */
export const getSettings = cache(load)

/**
 * Promo aktif? Env NEXT_PUBLIC_FREE_PROMO=true selalu menang (saklar darurat);
 * selain itu mengikuti pengaturan admin, termasuk tanggal berakhir (inklusif, WIB).
 */
export function isPromoActive(s: AppSettings): boolean {
  if (FREE_PROMO) return true
  if (!s.promo.enabled) return false
  if (!s.promo.until) return true
  return Date.now() <= new Date(`${s.promo.until}T23:59:59+07:00`).getTime()
}

/** Pintasan: promo aktif untuk request ini. */
export async function promoActive(): Promise<boolean> {
  return isPromoActive(await getSettings())
}

/** Simpan satu kunci pengaturan (service role). */
export async function saveSetting(key: string, value: unknown, updatedBy?: string) {
  memo = null
  const { error } = await createAdminClient()
    .from('app_settings' as never)
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: updatedBy ?? null } as never)
  return error?.message ?? null
}
