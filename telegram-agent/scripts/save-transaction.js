#!/usr/bin/env node
/**
 * save-transaction.js
 * Handle response dari AI: simpan transaksi (dengan date_offset / transaction_date) ATAU buat kategori.
 *
 * Usage: node save-transaction.js <telegramChatId> '<aiResponseJson>' '<rawMessage>'
 */

const path = require('path')
const fs = require('fs')

function resolveEnvPath() {
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'catetin-duit-agent', '.env'),
    path.join(process.env.HOME || '', 'openclaw', 'catetin-duit-agent', '.env'),
  ]
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p
  }
  return path.join(__dirname, '..', '.env')
}

require('dotenv').config({ path: resolveEnvPath() })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.APP_URL || 'https://catetinduit.vercel.app'
const BLOCKED_STATUSES = ['trial_expired', 'cancelled']
// Promo gratis: saat aktif, blokir langganan dimatikan (semua user bisa mencatat).
const FREE_PROMO = process.env.FREE_PROMO === 'true'

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount)
}

/** YYYY-MM-DD hari ini di timezone IANA (default Asia/Jakarta) */
function todayStrInTz(tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Tambah hari pada tanggal kalender YYYY-MM-DD (tanpa DST, aman untuk catat keuangan) */
function addDaysToYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + deltaDays)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Batas atas wajar untuk satu transaksi (Rp 1 triliun) — tangkal salah parse LLM. */
const MAX_AMOUNT = 1e12

/**
 * Terima amount dari LLM dan kembalikan bilangan bulat Rupiah, atau null
 * kalau tidak masuk akal. Menangani "50000", 50000, "50.000", "50rb", "1,5jt".
 */
function normalizeAmount(raw) {
  let n

  if (typeof raw === 'number') {
    n = raw
  } else if (typeof raw === 'string') {
    const s = raw.toLowerCase().trim()
    const m = s.match(/^([\d.,]+)\s*(rb|ribu|k|jt|juta|m|miliar)?$/)
    if (!m) return null
    // Hapus pemisah ribuan titik, ubah koma desimal jadi titik
    let numPart = m[1]
    if (numPart.includes(',')) numPart = numPart.replace(/\./g, '').replace(',', '.')
    else if ((numPart.match(/\./g) || []).length > 1) numPart = numPart.replace(/\./g, '')
    else if (/\.\d{3}$/.test(numPart)) numPart = numPart.replace(/\./g, '')
    n = Number(numPart)
    const mult = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6, m: 1e9, miliar: 1e9 }[m[2]]
    if (mult) n *= mult
  } else {
    return null
  }

  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return null
  return Math.round(n)
}

function labelForOffset(offset) {
  if (offset === -1) return 'kemarin'
  if (offset === -2) return '2 hari lalu'
  if (offset === -3) return '3 hari lalu'
  if (offset === -7) return 'minggu lalu'
  if (typeof offset === 'number' && offset < 0) return `${-offset} hari lalu`
  return null
}

function labelForYmd(ymd, tz) {
  const d = new Date(ymd + 'T12:00:00Z')
  return d.toLocaleDateString('id-ID', { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Tentukan transaction_date (YYYY-MM-DD) dan label singkat untuk konfirmasi Telegram
 */
function resolveTransactionDate(tx, tz, todayStr) {

  if (tx.transaction_date && ISO_DATE.test(String(tx.transaction_date).trim())) {
    const ymd = String(tx.transaction_date).trim()
    return {
      transaction_date: ymd,
      dateLabel: labelForYmd(ymd, tz),
    }
  }

  if (typeof tx.date_offset === 'number' && Number.isFinite(tx.date_offset)) {
    const ymd = addDaysToYmd(todayStr, tx.date_offset)
    return {
      transaction_date: ymd,
      dateLabel: tx.date_label || labelForOffset(tx.date_offset) || labelForYmd(ymd, tz),
    }
  }

  return {
    transaction_date: todayStr,
    dateLabel: null,
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCreateCategory(profile, parsed) {
  const { name, type = 'both', icon = '' } = parsed

  if (!name || name.trim().length === 0) {
    console.log('❌ Nama kategori tidak boleh kosong.')
    process.exit(0)
  }

  const categoryName = name.trim()

  // limit(1) wajib: kalau ada kategori global DAN kategori user dengan nama
  // sama, maybeSingle() tanpa limit melempar error, existing jadi undefined,
  // lalu duplikat tetap dibuat.
  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .ilike('name', categoryName)
    .or(`user_id.is.null,user_id.eq.${profile.id}`)
    .limit(1)
    .maybeSingle()

  if (existing) {
    console.log(
      `ℹ️ Kategori *${existing.name}* sudah ada di daftarmu.\n\n` +
      `Kamu bisa langsung pakai saat mencatat transaksi.`
    )
    return
  }

  const validTypes = ['income', 'expense', 'both']
  const categoryType = validTypes.includes(type) ? type : 'both'

  const { error } = await supabase
    .from('categories')
    .insert({
      user_id: profile.id,
      name: categoryName,
      type: categoryType,
      icon: icon || null,
      is_default: false,
    })

  if (error) {
    console.error('Insert category error:', error.message)
    console.log('❌ Gagal menambahkan kategori. Coba lagi ya.')
    process.exit(0)
  }

  const typeLabel = categoryType === 'income'
    ? 'pemasukan'
    : categoryType === 'expense'
      ? 'pengeluaran'
      : 'pemasukan & pengeluaran'

  console.log(
    `✅ Kategori *${icon ? icon + ' ' : ''}${categoryName}* berhasil ditambahkan!\n\n` +
    `Tipe: ${typeLabel}\n` +
    `Sekarang kamu bisa pakai kategori ini saat mencatat transaksi.\n\n` +
    `Lihat semua kategori: ${APP_URL}/dashboard/settings`
  )
}

async function handleSaveTransactions(profile, parsed, rawMessage) {
  const { transactions = [], message: aiMessage, clarification } = parsed

  if (transactions.length === 0) {
    console.log(
      aiMessage ??
      'Hmm, aku tidak bisa mendeteksi transaksi dari pesan itu. Coba tulis seperti: _beli kopi 25rb_ atau _gajian 5 juta_.'
    )
    return
  }

  const tz = process.env.USER_DEFAULT_TIMEZONE || 'Asia/Jakarta'
  const todayStr = todayStrInTz(tz)
  const savedResults = []

  for (const tx of transactions) {
    // Guard: jika AI tetap meneruskan transaksi dengan confidence < 0.6, tolak
    if (typeof tx.confidence === 'number' && tx.confidence < 0.6) {
      console.log(
        `Hmm, aku kurang yakin dengan transaksi ini (confidence terlalu rendah).\n\n` +
        `Coba tulis ulang lebih jelas, contoh:\n` +
        `_beli kopi 25rb_ atau _gajian 5 juta_`
      )
      return
    }

    // Validasi sebelum insert. Output LLM tidak bisa dipercaya apa adanya:
    // amount kadang datang sebagai "50rb"/"50.000", type kadang di luar enum.
    // Tanpa ini Postgres yang menolak, dan user cuma lihat "Gagal menyimpan".
    const amount = normalizeAmount(tx.amount)
    if (amount === null) {
      console.log(
        `Hmm, aku tidak yakin nominalnya berapa.\n\n` +
        `Coba tulis dengan angka jelas, contoh: _beli kopi 25rb_`
      )
      return
    }

    if (tx.type !== 'income' && tx.type !== 'expense') {
      console.log(
        `Hmm, aku tidak yakin ini pemasukan atau pengeluaran.\n\n` +
        `Coba perjelas, contoh: _beli kopi 25rb_ atau _terima gaji 5 juta_`
      )
      return
    }

    const description = String(tx.description || '').trim().slice(0, 500) || 'Transaksi'

    const { transaction_date, dateLabel } = resolveTransactionDate(tx, tz, todayStr)

    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', tx.category || '')
      .or(`user_id.is.null,user_id.eq.${profile.id}`)
      .limit(1)
      .maybeSingle()

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.id,
        type: tx.type,
        amount,
        category_id: category?.id ?? null,
        description,
        source: 'telegram',
        raw_message: rawMessage,
        ai_confidence: tx.confidence ?? null,
        needs_review: (tx.confidence ?? 1) < 0.7,
        transaction_date,
      })

    if (!insertError) {
      savedResults.push({ ...tx, amount, description, _resolvedDate: transaction_date, _dateLabel: dateLabel })
    } else {
      console.error(`Insert error for tx: ${insertError.message}`)
    }
  }

  if (savedResults.length === 0) {
    console.log('❌ Gagal menyimpan transaksi. Coba lagi ya.')
    process.exit(0)
  }

  const lines = savedResults.map((tx) => {
    const emoji = tx.type === 'income' ? '📈' : '📉'
    const nominal = formatRupiah(tx.amount)
    const cat = tx.category || 'Lainnya'
    const suffix = tx._dateLabel ? ` · ${tx._dateLabel}` : ''
    return `${emoji} *${tx.description}* — ${nominal}\n   _${cat}_${suffix}`
  })

  const plural = savedResults.length > 1 ? `${savedResults.length} transaksi` : 'Transaksi'

  let reply = `✅ ${plural} berhasil dicatat!\n\n` + lines.join('\n\n')

  if (clarification) {
    reply += `\n\n❓ ${clarification}`
  } else {
    reply += `\n\nLihat semua: ${APP_URL}/dashboard/transactions`
  }

  console.log(reply)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const telegramChatId = parseInt(process.argv[2], 10)
  const aiResponseRaw = process.argv[3] || '{}'
  const rawMessage = process.argv[4] || ''

  if (!telegramChatId || isNaN(telegramChatId)) {
    console.error('Error: telegramChatId tidak valid')
    process.exit(1)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, subscription_status')
    .eq('telegram_chat_id', telegramChatId)
    .single()

  if (profileError || !profile) {
    console.log(
      `❌ Akun Telegram kamu belum terhubung.\n\n` +
      `Daftar di: ${APP_URL}/register\n` +
      `Lalu hubungkan di: ${APP_URL}/dashboard/telegram`
    )
    process.exit(0)
  }

  if (!FREE_PROMO && BLOCKED_STATUSES.includes(profile.subscription_status)) {
    console.log(
      `🔒 Langganan kamu sudah berakhir.\n\n` +
      `Perpanjang Premium Rp 29.000/bulan di:\n` +
      `${APP_URL}/dashboard/subscription`
    )
    process.exit(0)
  }

  let parsed
  try {
    parsed = JSON.parse(aiResponseRaw)
  } catch {
    console.log('❌ Gagal memproses pesan. Coba kirim ulang dengan format yang lebih jelas.')
    process.exit(0)
  }

  const action = parsed.action

  if (action === 'create_category') {
    await handleCreateCategory(profile, parsed)
  } else if (action === 'non_financial') {
    console.log(
      parsed.message ??
      'Hmm, aku tidak bisa mendeteksi transaksi dari pesan itu. Coba tulis seperti: _beli kopi 25rb_ atau _gajian 5 juta_.'
    )
  } else {
    await handleSaveTransactions(profile, parsed, rawMessage)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
