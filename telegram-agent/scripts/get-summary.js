#!/usr/bin/env node
/**
 * get-summary.js
 * Tampilkan ringkasan keuangan bulan ini (/ringkasan)
 *
 * Usage: node get-summary.js <telegramChatId>
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.APP_URL || 'https://catetinduit.vercel.app'
const BLOCKED_STATUSES = ['trial_expired', 'cancelled']
// Promo gratis: harus sama dengan save-transaction.js, kalau tidak user bisa
// mencatat transaksi tapi ditolak saat membuka /ringkasan.
const FREE_PROMO = process.env.FREE_PROMO === 'true'

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount)
}

async function main() {
  const telegramChatId = parseInt(process.argv[2], 10)

  if (!telegramChatId || isNaN(telegramChatId)) {
    console.error('Error: telegramChatId tidak valid')
    process.exit(1)
  }

  // Cari profil user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, subscription_status')
    .eq('telegram_chat_id', telegramChatId)
    .single()

  if (profileError || !profile) {
    console.log(
      `❌ Akun Telegram kamu belum terhubung.\n\n` +
      `Hubungkan di: ${APP_URL}/dashboard/telegram`
    )
    process.exit(0)
  }

  if (!FREE_PROMO && BLOCKED_STATUSES.includes(profile.subscription_status)) {
    console.log(
      `🔒 Langganan kamu sudah berakhir.\n\n` +
      `Perpanjang Premium di:\n` +
      `${APP_URL}/dashboard/subscription`
    )
    process.exit(0)
  }

  // Hitung awal dan akhir bulan ini dalam timezone Asia/Jakarta
  const tz = process.env.USER_DEFAULT_TIMEZONE || 'Asia/Jakarta'
  const nowInTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [year, month] = nowInTz.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  // Ambil semua transaksi bulan ini
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('type, amount, categories(name)')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .gte('transaction_date', startOfMonth)
    .lte('transaction_date', endOfMonth)

  if (error) {
    console.error('Error fetching transactions:', error.message)
    process.exit(1)
  }

  if (!transactions || transactions.length === 0) {
    console.log(
      `📊 *Ringkasan ${monthName}*\n\n` +
      `Belum ada transaksi bulan ini.\n\n` +
      `Mulai catat dengan kirim pesan seperti:\n` +
      `_beli kopi 25rb_ atau _gajian 5 juta_`
    )
    return
  }

  // Hitung total income dan expense
  let totalIncome = 0
  let totalExpense = 0
  const expenseByCategory = {}

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount
    } else {
      totalExpense += tx.amount
      const catName = tx.categories?.name || 'Lainnya'
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + tx.amount
    }
  }

  const netCashflow = totalIncome - totalExpense
  const netEmoji = netCashflow >= 0 ? '📈' : '📉'

  // Top 3 kategori pengeluaran
  const topCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => `   • ${name}: ${formatRupiah(amount)}`)
    .join('\n')

  console.log(
    `📊 *Ringkasan ${monthName}*\n\n` +
    `💰 Pemasukan: *${formatRupiah(totalIncome)}*\n` +
    `💸 Pengeluaran: *${formatRupiah(totalExpense)}*\n` +
    `${netEmoji} Net Cashflow: *${formatRupiah(netCashflow)}*\n\n` +
    (topCategories
      ? `📂 *Pengeluaran Terbesar:*\n${topCategories}\n\n`
      : '') +
    `Total transaksi: ${transactions.length}\n` +
    `Dashboard lengkap: ${APP_URL}/dashboard`
  )
}

main().catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
