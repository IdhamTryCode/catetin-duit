/**
 * Pembatas laju sederhana di memori (sliding window per kunci).
 *
 * Catatan: state hidup per instance serverless, jadi ini pertahanan
 * "best effort" terhadap satu pengirim yang membanjiri — bukan pengganti
 * rate limit di tepi jaringan (Vercel Firewall).
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
