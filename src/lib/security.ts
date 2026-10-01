import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Bandingkan dua rahasia dalam waktu konstan (tahan timing attack).
 * Di-hash dulu supaya panjang yang berbeda tidak membocorkan informasi.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * Path tujuan redirect yang aman: hanya path internal ("/dashboard", "/x?y=1").
 * Menolak URL absolut dan trik seperti "//evil.com", "/\evil.com", "@evil.com"
 * yang membuat browser pindah ke domain lain (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\') || /[\r\n]/.test(next)) return fallback
  return next
}

/** Escape teks untuk disisipkan ke HTML (email). */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Cegah CSV/formula injection: sel yang diawali = + - @ (atau tab/CR) dieksekusi
 * Excel/Sheets sebagai rumus. Diberi awalan kutip tunggal supaya jadi teks.
 */
export function csvSafeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}
