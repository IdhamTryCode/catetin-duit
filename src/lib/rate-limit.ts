import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Pembatas laju di memori (sliding window per kunci). State hidup per instance
 * serverless, jadi hanya dipakai sebagai cadangan bila pembatas database
 * (rateLimitDb) tidak tersedia.
 */
const hits = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  // Jaga map tetap kecil
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  }
  return true
}

/**
 * Pembatas laju yang tersimpan di database (fungsi check_rate_limit, migrasi
 * 20261001_rate_limits.sql) — konsisten antar instance serverless.
 * Mengembalikan true jika percobaan ini masih dalam batas.
 *
 * Kalau fungsi belum ada atau database bermasalah, jatuh ke pembatas memori
 * supaya login tidak ikut mati.
 */
export async function rateLimitDb(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc('check_rate_limit' as never, {
      p_key: key,
      p_max: limit,
      p_window_seconds: windowSeconds,
    } as never)
    if (error) throw error
    return data === true
  } catch {
    return rateLimit(key, limit, windowSeconds * 1000)
  }
}

/** IP klien dari header yang diisi Vercel (bukan dari klien langsung). */
export function clientIp(h: Headers): string {
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}
