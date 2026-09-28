# Runbook — operasional Catetin Duit

Catatan operasional produksi. Riwayat lama (OpenClaw, insiden OOM 26 Sep 2026)
ada di riwayat git folder ini sebelum 28 Sep 2026.

## Arsitektur

```
Telegram → webhook → Vercel /api/webhooks/telegram
   ├─ /start /connect /riwayat /ringkasan /bantuan → kode biasa, tanpa LLM
   └─ teks bebas → 1× panggilan LLM (JSON) → validasi zod → Supabase

Vercel Cron (01:00 UTC / 08:00 WIB) → /api/cron/daily
   ├─ pengingat trial H-3/H-1 (email)            ┐ dilewati saat
   ├─ trial lewat → trial_expired (email)        ┘ FREE_PROMO aktif
   ├─ pengingat Premium H-3/H-1 (email)
   └─ premium lewat → grace_period (3 hari) → cancelled
```

Bot memblokir status `trial_expired` dan `cancelled` (kecuali FREE_PROMO aktif).
Web tetap bisa dibuka, dengan akses terbatas.

## VM (opsional, di luar jalur produksi)

VM hanya menjalankan pemeliharaan. Kalau VM mati, pengguna tetap terlayani.
Script ada di `scripts/`, dipasang di VM pada `~/openclaw/catetin-duit-agent/`
dengan `.env` berisi variabel dari `.env.example`.

```
0  3 * * *  scripts/keepalive-supabase.sh   # jaga Supabase free-tier (juga ada GitHub Action)
0  4 * * *  scripts/rotate-logs.sh          # rotasi log
*/10 * * * * scripts/healthcheck.sh         # pantau webhook, alert ke Telegram owner
```

`healthcheck.sh` memeriksa: webhook terdaftar tanpa error, antrean tidak
menumpuk, endpoint webhook membalas 401 untuk request tanpa secret, dan
Supabase terjangkau. Alert di-throttle 1 jam per jenis masalah.
Jalankan manual: `bash scripts/healthcheck.sh` (exit 0 = sehat).

## Webhook Telegram

```bash
# daftarkan / cek status / hapus
curl -X POST   "https://www.catetinduit.de/api/webhooks/telegram/setup?secret=$CRON_SECRET"
curl           "https://www.catetinduit.de/api/webhooks/telegram/setup?secret=$CRON_SECRET"
curl -X DELETE "https://www.catetinduit.de/api/webhooks/telegram/setup?secret=$CRON_SECRET"
```

Tes cepat setelah deploy: kirim `/bantuan`, `/riwayat`, `beli kopi 25rb` ke bot.

## Cron harian

Terdaftar lewat `vercel.json` → Vercel → Settings → Cron Jobs. Tombol **Run**
untuk menjalankan manual; hasilnya di Logs, cari `[cron/daily]`.
Tanpa `CRON_SECRET` di env Vercel, panggilan cron ditolak 401.

**Jangan jalankan `/api/cron/daily` dari laptop.** `.env.local` biasanya tidak
berisi `NEXT_PUBLIC_FREE_PROMO`, sehingga cron lokal mengubah status user di
database produksi dan mengirim email sungguhan.

## Promo gratis

Saklar tunggal: env `NEXT_PUBLIC_FREE_PROMO=true` di Vercel. Mengubahnya
**wajib diikuti Redeploy** (env `NEXT_PUBLIC_` ditanam saat build).
Saat promo dimatikan, run cron berikutnya menandai semua trial yang sudah
lewat sebagai `trial_expired` dan mengirim email ke mereka sekaligus.

## Aktivasi Premium manual (pembayaran via WhatsApp)

Admin → Users → kolom "Ubah status" → **Premium (+30 hari)**. Diperpanjang dari
tanggal berakhir yang masih berjalan, atau dari hari ini.
