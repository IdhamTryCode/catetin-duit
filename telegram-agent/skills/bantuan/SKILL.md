---
name: bantuan
description: Show help guide for Catetin Duit bot when user sends /bantuan command
user-invocable: true
---

# bantuan

Use this skill when the user sends `/bantuan` or `/help`.

## When to activate

- Message is `/bantuan` or `/help`
- User asks for help or how to use the bot

## Reply with this message

```
📖 *Panduan Catetin Duit*

Catat keuangan cukup dengan chat biasa!

📌 *Cara Mencatat:*
• Pengeluaran: _beli makan siang 35rb_
• Pemasukan: _terima bayaran client 2jt_
• Beberapa: _beli bensin 50rb dan dapat gofood 500rb_

📊 *Perintah:*
/riwayat — 5 transaksi terakhir
/ringkasan — Ringkasan keuangan bulan ini
/bantuan — Panduan ini
/connect KODE — Hubungkan ulang akun

🌐 *Dashboard Web:*
{APP_URL}/dashboard

💡 *Tips:*
• Bot paham singkatan: rb = ribu, jt = juta
• Bisa catat beberapa transaksi sekaligus
• Edit & hapus tersedia di dashboard web

Ada pertanyaan? Kunjungi: {APP_URL}/bantuan
```

Replace `{APP_URL}` with the actual APP_URL from environment.
