#!/usr/bin/env node
/**
 * connect-telegram.js
 * Menghubungkan Telegram chat_id dengan akun web via connect_code
 *
 * Usage: node connect-telegram.js <telegramChatId> <code>
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = process.env.APP_URL || 'https://catetinduit.vercel.app'

/**
 * Naikkan attempt_count sebuah connect code.
 * Dipanggil di SEMUA cabang validasi yang gagal, supaya batas 5 percobaan
 * benar-benar membatasi penebakan kode — bukan cuma kasus profil tak ketemu.
 */
async function bumpAttempt(connectCode) {
  const { error } = await supabase
    .from('connect_codes')
    .update({ attempt_count: (connectCode.attempt_count ?? 0) + 1 })
    .eq('id', connectCode.id)
  if (error) console.error('Gagal menaikkan attempt_count:', error.message)
}

async function main() {
  const telegramChatId = parseInt(process.argv[2], 10)
  const code = (process.argv[3] || '').toUpperCase().trim()

  if (!telegramChatId || isNaN(telegramChatId)) {
    console.error('Error: telegramChatId tidak valid')
    process.exit(1)
  }

  // Jika tidak ada kode → tampilkan instruksi
  if (!code || code.length < 6) {
    console.log(
      `Halo! 👋 Selamat datang di *Catetin Duit*.\n\n` +
      `Untuk menghubungkan akun:\n` +
      `1. Daftar atau login di: ${APP_URL}/register\n` +
      `2. Buka halaman Telegram di dashboard\n` +
      `3. Salin kode 6 karakter yang muncul\n` +
      `4. Kirim ke sini: \`/connect KODE_KAMU\`\n\n` +
      `Belum punya akun? Daftar gratis di: ${APP_URL}/register`
    )
    return
  }

  // Rate limiting sederhana — cek attempt_count
  const { data: connectCode } = await supabase
    .from('connect_codes')
    .select('id, user_id, attempt_count, expires_at, used_at')
    .eq('code', code)
    .single()

  if (!connectCode) {
    console.log(
      `❌ Kode tidak valid.\n\n` +
      `Buat kode baru di: ${APP_URL}/dashboard/telegram`
    )
    process.exit(0)
  }

  // Cek max attempts — dicek lebih dulu supaya kode terkunci tidak bisa
  // terus diuji lewat cabang-cabang di bawahnya.
  if (connectCode.attempt_count >= 5) {
    console.log(
      `❌ Kode terkunci karena terlalu banyak percobaan gagal.\n\n` +
      `Buat kode baru di: ${APP_URL}/dashboard/telegram`
    )
    process.exit(0)
  }

  // Cek sudah dipakai
  if (connectCode.used_at) {
    await bumpAttempt(connectCode)
    console.log(
      `❌ Kode sudah pernah digunakan.\n\n` +
      `Buat kode baru di: ${APP_URL}/dashboard/telegram`
    )
    process.exit(0)
  }

  // Cek expiry
  if (new Date(connectCode.expires_at) < new Date()) {
    await bumpAttempt(connectCode)
    console.log(
      `❌ Kode sudah kadaluarsa.\n\n` +
      `Buat kode baru di: ${APP_URL}/dashboard/telegram`
    )
    process.exit(0)
  }

  // Ambil data profil user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, subscription_status, trial_ends_at, telegram_chat_id')
    .eq('id', connectCode.user_id)
    .single()

  if (profileError || !profile) {
    await bumpAttempt(connectCode)
    console.log('❌ Akun tidak ditemukan. Pastikan kamu sudah terdaftar di web.')
    process.exit(0)
  }

  // Cek apakah akun ini sudah terhubung ke Telegram lain
  if (profile.telegram_chat_id && profile.telegram_chat_id !== telegramChatId) {
    await bumpAttempt(connectCode)
    console.log(
      `⚠️ Akun ini sudah terhubung dengan Telegram lain.\n` +
      `Putuskan koneksi lama di: ${APP_URL}/dashboard/settings`
    )
    process.exit(0)
  }

  // Cek arah sebaliknya: chat Telegram ini sudah dipakai akun web lain.
  // Tanpa ini, satu chat_id bisa menempel ke >1 profil dan semua query
  // .eq('telegram_chat_id', ...).single() akan gagal "multiple rows".
  const { data: chatOwners, error: chatOwnerError } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', telegramChatId)
    .neq('id', profile.id)
    .limit(1)

  if (chatOwnerError) {
    console.error('Error checking chat_id ownership:', chatOwnerError.message)
    process.exit(1)
  }

  if (chatOwners && chatOwners.length > 0) {
    await bumpAttempt(connectCode)
    console.log(
      `⚠️ Telegram ini sudah terhubung ke akun Catetin Duit yang lain.\n\n` +
      `Putuskan dulu koneksinya di: ${APP_URL}/dashboard/settings`
    )
    process.exit(0)
  }

  // Update profil: simpan telegram_chat_id
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      telegram_chat_id: telegramChatId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  if (updateError) {
    console.error('Error updating profile:', updateError.message)
    process.exit(1)
  }

  // Tandai kode sebagai sudah dipakai
  await supabase
    .from('connect_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', connectCode.id)

  // Format tanggal trial
  const trialEnd = profile.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '-'

  const name = profile.full_name ? profile.full_name.split(' ')[0] : 'Kamu'

  console.log(
    `Halo ${name}! 🎉 Akun berhasil terhubung ke *Catetin Duit*.\n\n` +
    `Sekarang kamu bisa langsung catat keuangan:\n\n` +
    `📌 *Cara Pakai:*\n` +
    `• Pengeluaran: _beli makan siang 35rb_\n` +
    `• Pemasukan: _gajian 5 juta_\n` +
    `• Beberapa sekaligus: _beli bensin 50rb dan terima transfer 1.5jt_\n\n` +
    `📊 *Perintah:*\n` +
    `/riwayat — Transaksi terakhir\n` +
    `/ringkasan — Ringkasan bulan ini\n` +
    `/bantuan — Panduan lengkap\n\n` +
    `🗓️ Trial aktif hingga: *${trialEnd}*\n` +
    `Dashboard: ${APP_URL}/dashboard\n\n` +
    `Semangat mencatat! 💪`
  )
}

main().catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
