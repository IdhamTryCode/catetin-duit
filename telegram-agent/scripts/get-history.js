#!/usr/bin/env node
/**
 * get-history.js
 * Tampilkan 5 transaksi terakhir user (/riwayat)
 *
 * Usage: node get-history.js <telegramChatId>
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
// mencatat transaksi tapi ditolak saat membuka /riwayat.
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

  // Ambil 5 transaksi terakhir
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, type, amount, description, transaction_date, categories(name)')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching transactions:', error.message)
    process.exit(1)
  }

  if (!transactions || transactions.length === 0) {
    console.log(
      `📭 Belum ada transaksi yang dicatat.\n\n` +
      `Mulai dengan kirim pesan seperti:\n` +
      `_beli kopi 25rb_ atau _gajian 5 juta_`
    )
    return
  }

  const lines = transactions.map((tx) => {
    const emoji = tx.type === 'income' ? '📈' : '📉'
    const nominal = formatRupiah(tx.amount)
    const cat = tx.categories?.name || 'Lainnya'
    const date = new Date(tx.transaction_date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short',
    })
    return `${emoji} *${tx.description}*\n   ${nominal} · ${cat} · ${date}`
  })

  console.log(
    `📋 *5 Transaksi Terakhir*\n\n` +
    lines.join('\n\n') +
    `\n\nLihat semua: ${APP_URL}/dashboard/transactions`
  )
}

main().catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
