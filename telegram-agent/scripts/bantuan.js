#!/usr/bin/env node
/**
 * bantuan.js
 * Tampilkan panduan penggunaan bot (/bantuan atau /help)
 *
 * Usage: node bantuan.js <telegramChatId>
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const APP_URL = process.env.APP_URL || 'https://catetinduit.vercel.app'

async function main() {
  const telegramChatId = parseInt(process.argv[2], 10)

  if (!telegramChatId || isNaN(telegramChatId)) {
    console.error('Error: telegramChatId tidak valid')
    process.exit(1)
  }

  console.log(
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
    `🌐 *Dashboard Web:*\n` +
    `${APP_URL}/dashboard\n\n` +
    `💡 *Tips:*\n` +
    `• Bot paham singkatan: rb = ribu, jt = juta\n` +
    `• Bisa catat beberapa transaksi sekaligus\n` +
    `• Edit & hapus tersedia di dashboard web\n\n` +
    `Ada pertanyaan? Kunjungi: ${APP_URL}/bantuan`
  )
}

main().catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
