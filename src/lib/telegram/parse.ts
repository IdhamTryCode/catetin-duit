/**
 * Pengurai pesan keuangan berbasis LLM.
 *
 * Perannya sengaja dipersempit: LLM HANYA menerjemahkan teks bebas menjadi
 * JSON. Ia tidak menyimpan apa pun, tidak memanggil tool, dan tidak menyusun
 * balasan untuk pengguna. Semua itu dikerjakan kode biasa di route handler.
 *
 * Latar: arsitektur sebelumnya menyuruh agent LLM merangkai command shell
 * (`node save-transaction.js "<chatId>" '<json>' '<pesan>'`). Itu membuat
 * model bisa mengarang konfirmasi sukses tanpa ada yang tersimpan, dan
 * pesan berisi tanda kutip merusak command. Di sini keduanya mustahil.
 */

import { z } from 'zod'

const TransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(1e12),
  category: z.string().min(1).transform((v) => v.slice(0, 100)),
  // Potong, jangan tolak: LLM kadang menyalin pesan panjang apa adanya ke
  // deskripsi. Menolaknya membuat transaksi yang sebenarnya valid gagal
  // dengan pesan "tidak bisa mendeteksi transaksi".
  description: z.string().min(1).transform((v) => v.slice(0, 500)),
  confidence: z.number().min(0).max(1),
  /** -1 = kemarin, -7 = minggu lalu. Dipakai kalau transaction_date kosong. */
  date_offset: z.number().int().min(-3650).max(0).optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const ParsedSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('save_transactions'),
    transactions: z.array(TransactionSchema).min(1).max(20),
    clarification: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal('create_category'),
    name: z.string().min(1).max(60),
    type: z.enum(['income', 'expense', 'both']).default('both'),
    icon: z.string().max(8).optional(),
  }),
  z.object({
    action: z.literal('non_financial'),
    message: z.string().min(1).max(500),
  }),
])

export type Parsed = z.infer<typeof ParsedSchema>

const SYSTEM_PROMPT = `Kamu adalah pengurai transaksi keuangan untuk aplikasi Catetin Duit (Bahasa Indonesia).

Tugasmu HANYA mengubah pesan pengguna menjadi JSON. Jangan menulis teks lain.

Keluaran WAJIB salah satu dari tiga bentuk:

1) Ada transaksi keuangan:
{"action":"save_transactions","transactions":[{"type":"income"|"expense","amount":50000,"category":"Makanan & Minuman","description":"Makan siang","confidence":0.95}]}

2) Pengguna minta kategori baru (kata kunci: tambah/buat/daftarkan kategori):
{"action":"create_category","name":"Hiburan","type":"expense","icon":"🎮"}

3) Bukan soal keuangan:
{"action":"non_financial","message":"balasan ramah dalam Bahasa Indonesia"}

Aturan:
- amount selalu ANGKA bulat rupiah. rb/ribu/k = ribu, jt/juta = juta.
  "25rb" -> 25000. "1,5jt" -> 1500000. Jangan kirim string.
- Beberapa transaksi dalam satu pesan -> masukkan semua ke array.
- Tanggal: "kemarin" -> "date_offset":-1, "2 hari lalu" -> -2,
  "minggu lalu" -> -7, tanggal pasti -> "transaction_date":"YYYY-MM-DD".
  Tidak disebut -> jangan sertakan field tanggal.
- confidence: 0.85+ kalau jelas; 0.6-0.84 kalau agak ragu (boleh tambahkan
  "clarification"); di bawah 0.6 gunakan bentuk non_financial.
- Kategori yang tersedia — pengeluaran: Makanan & Minuman, Transportasi,
  Bahan Baku, Pengeluaran Lain. pemasukan: Gaji & Upah, Penjualan Online,
  Pemasukan Lain. Pilih yang paling cocok; kalau tidak ada, pakai
  "Pengeluaran Lain" atau "Pemasukan Lain".`

export interface ParseResult {
  ok: boolean
  parsed?: Parsed
  error?: string
  elapsedMs: number
}

/**
 * Panggil LLM sekali dan validasi hasilnya dengan zod.
 * Tidak ada agent loop, tidak ada tool, tidak ada shell.
 */
export async function parseMessage(text: string): Promise<ParseResult> {
  const started = Date.now()

  const baseUrl = process.env.LLM_BASE_URL
  const apiKey = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL

  if (!baseUrl || !apiKey || !model) {
    return { ok: false, error: 'LLM belum dikonfigurasi', elapsedMs: 0 }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.slice(0, 2000) },
        ],
      }),
    })

    if (!res.ok) {
      return {
        ok: false,
        error: `LLM HTTP ${res.status}`,
        elapsedMs: Date.now() - started,
      }
    }

    const body = await res.json()
    const content: unknown = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      return { ok: false, error: 'LLM tidak mengembalikan teks', elapsedMs: Date.now() - started }
    }

    let raw: unknown
    try {
      raw = JSON.parse(stripCodeFence(content))
    } catch {
      return { ok: false, error: 'LLM tidak mengembalikan JSON valid', elapsedMs: Date.now() - started }
    }

    // Kompatibilitas: bentuk lama {"transactions":[...]} tanpa "action".
    if (raw && typeof raw === 'object' && !('action' in raw) && 'transactions' in raw) {
      ;(raw as Record<string, unknown>).action = 'save_transactions'
    }

    const result = ParsedSchema.safeParse(raw)
    if (!result.success) {
      return {
        ok: false,
        error: `Bentuk JSON tidak sesuai: ${result.error.issues[0]?.message ?? 'unknown'}`,
        elapsedMs: Date.now() - started,
      }
    }

    return { ok: true, parsed: result.data, elapsedMs: Date.now() - started }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      error: aborted ? 'LLM timeout' : `LLM error: ${(err as Error).message}`,
      elapsedMs: Date.now() - started,
    }
  } finally {
    clearTimeout(timeout)
  }
}

/** Sebagian model membungkus JSON dalam ```json ... ``` meski diminta tidak. */
function stripCodeFence(s: string): string {
  const t = s.trim()
  if (!t.startsWith('```')) return t
  return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
}
