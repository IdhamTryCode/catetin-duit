/**
 * Handler perintah dan penyimpanan transaksi.
 *
 * Semua fungsi di sini deterministik — tidak ada LLM. Hanya penguraian
 * transaksi bebas yang memakai LLM, dan itu terjadi di `parse.ts`, hasilnya
 * sudah divalidasi zod sebelum sampai ke sini.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Parsed } from './parse'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://catetin-duit.vercel.app'
const BLOCKED_STATUSES = ['trial_expired', 'cancelled']
const FREE_PROMO = process.env.FREE_PROMO === 'true'
const TZ = process.env.USER_DEFAULT_TIMEZONE || 'Asia/Jakarta'

const CODE_RE = /^[A-Z0-9]{6}$/
/** Kata dari deep link lama `t.me/bot?start=connect` — bukan kode. */
const NOT_A_CODE = new Set(['CONNECT', 'START', 'MULAI'])

export interface Profile {
  id: string
  full_name: string | null
  subscription_status: string
  trial_ends_at?: string | null
  telegram_chat_id?: number | null
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function todayInTz(tz: string = TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addDaysToYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return [
    dt.getUTCFullYear(),
    String(dt.getUTCMonth() + 1).padStart(2, '0'),
    String(dt.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function dateLabel(offset: number | undefined): string | null {
  if (offset === undefined || offset === 0) return null
  if (offset === -1) return 'kemarin'
  if (offset === -7) return 'minggu lalu'
  return `${-offset} hari lalu`
}

export function subscriptionBlocked(profile: Profile): boolean {
  return !FREE_PROMO && BLOCKED_STATUSES.includes(profile.subscription_status)
}

export const MSG = {
  notConnected:
    `❌ Akun Telegram kamu belum terhubung.\n\n` +
    `Daftar di: ${APP_URL}/register\n` +
    `Lalu hubungkan di: ${APP_URL}/dashboard/telegram`,
  blocked:
    `🔒 Langganan kamu sudah berakhir.\n\n` +
    `Perpanjang Premium di:\n${APP_URL}/dashboard/subscription`,
  welcome:
    `Halo! 👋 Selamat datang di *Catetin Duit*.\n\n` +
    `Untuk menghubungkan akun:\n` +
    `1. Daftar atau login di: ${APP_URL}/register\n` +
    `2. Buka halaman Telegram di dashboard\n` +
    `3. Salin kode 6 karakter yang muncul\n` +
    `4. Kirim ke sini: \`/connect KODE_KAMU\`\n\n` +
    `Belum punya akun? Daftar gratis di: ${APP_URL}/register`,
  badCode:
    `❌ Kode harus 6 karakter (huruf & angka).\n\n` +
    `Ambil kode baru di: ${APP_URL}/dashboard/telegram`,
  help:
    `📖 *Panduan Catetin Duit*\n\n` +
    `Catat keuangan cukup dengan chat biasa!\n\n` +
    `📌 *Cara Mencatat:*\n` +
    `• Pengeluaran: _beli makan siang 35rb_\n` +
    `• Pemasukan: _terima bayaran client 2jt_\n` +
    `• Beberapa: _beli bensin 50rb dan dapat gofood 500rb_\n\n` +
    `📊 *Perintah:*\n` +
    `/riwayat — 5 transaksi terakhir\n` +
    `/ringkasan — Ringkasan keuangan bulan ini\n` +
    `/bantuan — Panduan ini\n` +
    `/connect KODE — Hubungkan ulang akun\n\n` +
    `🌐 *Dashboard Web:*\n${APP_URL}/dashboard\n\n` +
    `💡 *Tips:*\n` +
    `• Bot paham singkatan: rb = ribu, jt = juta\n` +
    `• Bisa catat beberapa transaksi sekaligus\n` +
    `• Edit & hapus tersedia di dashboard web`,
  genericError: '❌ Terjadi kesalahan. Coba lagi beberapa saat.',
  cannotParse:
    'Hmm, aku tidak bisa mendeteksi transaksi dari pesan itu.\n\n' +
    'Coba tulis seperti: _beli kopi 25rb_ atau _gajian 5 juta_.',
}

export async function findProfileByChatId(
  db: SupabaseClient,
  chatId: number,
): Promise<Profile | null> {
  // limit(1) bukan single(): kalau sampai ada dua profil dengan chat_id sama,
  // kita ingin tetap melayani, bukan melempar "multiple rows".
  const { data } = await db
    .from('profiles')
    .select('id, full_name, subscription_status, trial_ends_at, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .limit(1)
  return data?.[0] ?? null
}

// ── /connect ────────────────────────────────────────────────────────────────

export async function handleConnect(
  db: SupabaseClient,
  chatId: number,
  rawCode: string,
): Promise<string> {
  const code = rawCode.toUpperCase().trim()

  if (!code || NOT_A_CODE.has(code)) return MSG.welcome
  if (!CODE_RE.test(code)) return MSG.badCode

  const { data: rows } = await db
    .from('connect_codes')
    .select('id, user_id, attempt_count, expires_at, used_at')
    .eq('code', code)
    .limit(1)

  const cc = rows?.[0]
  if (!cc) return `❌ Kode tidak valid.\n\nBuat kode baru di: ${APP_URL}/dashboard/telegram`

  const bump = async () => {
    await db
      .from('connect_codes')
      .update({ attempt_count: (cc.attempt_count ?? 0) + 1 })
      .eq('id', cc.id)
  }

  if ((cc.attempt_count ?? 0) >= 5) {
    return `❌ Kode terkunci karena terlalu banyak percobaan gagal.\n\nBuat kode baru di: ${APP_URL}/dashboard/telegram`
  }
  if (cc.used_at) {
    await bump()
    return `❌ Kode sudah pernah digunakan.\n\nBuat kode baru di: ${APP_URL}/dashboard/telegram`
  }
  if (new Date(cc.expires_at) < new Date()) {
    await bump()
    return `❌ Kode sudah kadaluarsa.\n\nBuat kode baru di: ${APP_URL}/dashboard/telegram`
  }

  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, subscription_status, trial_ends_at, telegram_chat_id')
    .eq('id', cc.user_id)
    .limit(1)

  const profile = profiles?.[0]
  if (!profile) {
    await bump()
    return '❌ Akun tidak ditemukan. Pastikan kamu sudah terdaftar di web.'
  }

  if (profile.telegram_chat_id && profile.telegram_chat_id !== chatId) {
    await bump()
    return `⚠️ Akun ini sudah terhubung dengan Telegram lain.\nPutuskan koneksi lama di: ${APP_URL}/dashboard/settings`
  }

  // Arah sebaliknya: chat ini sudah dipakai akun web lain.
  const { data: others } = await db
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .neq('id', profile.id)
    .limit(1)

  if (others && others.length > 0) {
    await bump()
    return `⚠️ Telegram ini sudah terhubung ke akun Catetin Duit yang lain.\n\nPutuskan dulu di: ${APP_URL}/dashboard/settings`
  }

  const { error } = await db
    .from('profiles')
    .update({ telegram_chat_id: chatId, updated_at: new Date().toISOString() })
    .eq('id', profile.id)

  if (error) return MSG.genericError

  await db.from('connect_codes').update({ used_at: new Date().toISOString() }).eq('id', cc.id)

  const name = profile.full_name ? profile.full_name.split(' ')[0] : 'Kamu'
  const trialEnd = profile.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '-'

  return (
    `Halo ${name}! 🎉 Akun berhasil terhubung ke *Catetin Duit*.\n\n` +
    `Sekarang kamu bisa langsung catat keuangan:\n\n` +
    `📌 *Cara Pakai:*\n` +
    `• Pengeluaran: _beli makan siang 35rb_\n` +
    `• Pemasukan: _gajian 5 juta_\n\n` +
    `📊 *Perintah:*\n` +
    `/riwayat — Transaksi terakhir\n` +
    `/ringkasan — Ringkasan bulan ini\n` +
    `/bantuan — Panduan lengkap\n\n` +
    `🗓️ Trial aktif hingga: *${trialEnd}*\n` +
    `Dashboard: ${APP_URL}/dashboard`
  )
}

// ── /riwayat ────────────────────────────────────────────────────────────────

export async function handleHistory(db: SupabaseClient, profile: Profile): Promise<string> {
  const { data, error } = await db
    .from('transactions')
    .select('id, type, amount, description, transaction_date, categories(name)')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return MSG.genericError
  if (!data || data.length === 0) {
    return `📭 Belum ada transaksi yang dicatat.\n\nMulai dengan kirim pesan seperti:\n_beli kopi 25rb_ atau _gajian 5 juta_`
  }

  const lines = data.map((tx) => {
    const emoji = tx.type === 'income' ? '📈' : '📉'
    const cat = (tx.categories as { name?: string } | null)?.name || 'Lainnya'
    const date = new Date(tx.transaction_date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short',
    })
    return `${emoji} *${tx.description}*\n   ${formatRupiah(tx.amount)} · ${cat} · ${date}`
  })

  return (
    `📋 *5 Transaksi Terakhir*\n\n` +
    lines.join('\n\n') +
    `\n\nLihat semua: ${APP_URL}/dashboard/transactions`
  )
}

// ── /ringkasan ──────────────────────────────────────────────────────────────

export async function handleSummary(db: SupabaseClient, profile: Profile): Promise<string> {
  const today = todayInTz()
  const [year, month] = today.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  })

  const { data, error } = await db
    .from('transactions')
    .select('type, amount, categories(name)')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .gte('transaction_date', start)
    .lte('transaction_date', end)

  if (error) return MSG.genericError
  if (!data || data.length === 0) {
    return `📊 *Ringkasan ${monthName}*\n\nBelum ada transaksi bulan ini.\n\nMulai catat dengan kirim pesan seperti:\n_beli kopi 25rb_`
  }

  let income = 0
  let expense = 0
  const byCat: Record<string, number> = {}

  for (const tx of data) {
    if (tx.type === 'income') {
      income += tx.amount
    } else {
      expense += tx.amount
      const cat = (tx.categories as { name?: string } | null)?.name || 'Lainnya'
      byCat[cat] = (byCat[cat] || 0) + tx.amount
    }
  }

  const net = income - expense
  const top = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n, a]) => `   • ${n}: ${formatRupiah(a)}`)
    .join('\n')

  return (
    `📊 *Ringkasan ${monthName}*\n\n` +
    `💰 Pemasukan: *${formatRupiah(income)}*\n` +
    `💸 Pengeluaran: *${formatRupiah(expense)}*\n` +
    `${net >= 0 ? '📈' : '📉'} Net Cashflow: *${formatRupiah(net)}*\n\n` +
    (top ? `📂 *Pengeluaran Terbesar:*\n${top}\n\n` : '') +
    `Total transaksi: ${data.length}\n` +
    `Dashboard lengkap: ${APP_URL}/dashboard`
  )
}

// ── simpan transaksi / buat kategori ────────────────────────────────────────

export async function handleParsed(
  db: SupabaseClient,
  profile: Profile,
  parsed: Parsed,
  rawMessage: string,
  dedupeKey: string,
): Promise<string> {
  if (parsed.action === 'non_financial') return parsed.message

  if (parsed.action === 'create_category') {
    const name = parsed.name.trim()
    const { data: existing } = await db
      .from('categories')
      .select('id, name')
      .ilike('name', name)
      .or(`user_id.is.null,user_id.eq.${profile.id}`)
      .limit(1)

    if (existing && existing.length > 0) {
      return `ℹ️ Kategori *${existing[0].name}* sudah ada di daftarmu.`
    }

    const { error } = await db.from('categories').insert({
      user_id: profile.id,
      name,
      type: parsed.type,
      icon: parsed.icon || null,
      is_default: false,
    })

    if (error) return '❌ Gagal menambahkan kategori. Coba lagi ya.'
    return `✅ Kategori *${parsed.icon ? parsed.icon + ' ' : ''}${name}* berhasil ditambahkan!`
  }

  const today = todayInTz()
  const saved: Array<{ text: string }> = []

  for (let i = 0; i < parsed.transactions.length; i++) {
    const tx = parsed.transactions[i]
    const date =
      tx.transaction_date ??
      (tx.date_offset !== undefined ? addDaysToYmd(today, tx.date_offset) : today)

    const { data: cats } = await db
      .from('categories')
      .select('id')
      .ilike('name', tx.category)
      .or(`user_id.is.null,user_id.eq.${profile.id}`)
      .limit(1)

    const { error } = await db.from('transactions').insert({
      user_id: profile.id,
      type: tx.type,
      amount: Math.round(tx.amount),
      category_id: cats?.[0]?.id ?? null,
      description: tx.description,
      source: 'telegram',
      raw_message: rawMessage,
      ai_confidence: tx.confidence,
      needs_review: tx.confidence < 0.7,
      transaction_date: date,
      dedupe_key: `${dedupeKey}:${i}`,
    })

    if (error) {
      // 23505 = unique_violation → update Telegram terkirim dua kali.
      // Bukan kegagalan: transaksinya memang sudah tersimpan.
      if (error.code === '23505') continue
      console.error('[telegram] insert gagal:', error.message)
      continue
    }

    const label = dateLabel(tx.date_offset)
    saved.push({
      text:
        `${tx.type === 'income' ? '📈' : '📉'} *${tx.description}* — ${formatRupiah(tx.amount)}\n` +
        `   _${tx.category}_${label ? ` · ${label}` : ''}`,
    })
  }

  if (saved.length === 0) {
    return '❌ Gagal menyimpan transaksi. Coba lagi ya.'
  }

  const plural = saved.length > 1 ? `${saved.length} transaksi` : 'Transaksi'
  let reply = `✅ ${plural} berhasil dicatat!\n\n` + saved.map((s) => s.text).join('\n\n')

  if (parsed.action === 'save_transactions' && parsed.clarification) {
    reply += `\n\n❓ ${parsed.clarification}`
  } else {
    reply += `\n\nLihat semua: ${APP_URL}/dashboard/transactions`
  }

  return reply
}
