# Catetin Duit

Asisten keuangan via Telegram. Pengguna cukup mengirim chat seperti
`beli kopi 25rb` ke [@CatetinDuitDe_bot](https://t.me/CatetinDuitDe_bot), dan
transaksinya tercatat otomatis lalu tampil di dashboard web.

**Produksi:** [catetinduit.de](https://www.catetinduit.de)

## Fitur

- **Catat lewat Telegram.** Bahasa natural Indonesia/Inggris diurai LLM jadi
  nominal, jenis, kategori, dan tanggal (`kemarin`, `2 hari lalu`, dst).
- **Perintah bot:** `/start`, `/connect KODE`, `/riwayat`, `/ringkasan`, `/bantuan`.
- **Dashboard web:** ringkasan bulanan, grafik tren 6 bulan, daftar transaksi
  (tambah manual, edit, hapus, export CSV), kategori kustom.
- **Hubungkan akun** lewat deep link `t.me/CatetinDuitDe_bot?start=KODE`
  (kode berlaku 15 menit, maks 3 per jam, terkunci setelah 5 percobaan gagal).
- **Langganan:** Trial 7 hari (akses penuh) → Premium Rp 14.999/bulan, dengan
  masa tenggang 3 hari setelah Premium berakhir.
- **Panel admin:** statistik dan pengelolaan status langganan user.

## Stack

| Bagian | Teknologi |
|---|---|
| Web & API | Next.js 14 (App Router), React 18, TypeScript |
| UI | Tailwind CSS v4, komponen shadcn/Base UI, lucide-react, recharts |
| Data & auth | Supabase (Postgres + RLS, Auth email/Google/GitHub) |
| Bot | Telegram Bot API (webhook) + LLM OpenAI-compatible (Kenari) |
| Email | Resend |
| Monitoring | Sentry, Vercel Logs |
| Hosting | Vercel (region `sin1`) + Vercel Cron |

## Arsitektur

```
Telegram ──webhook──▶ /api/webhooks/telegram
                        ├─ perintah (/riwayat, /ringkasan, …) → kode biasa
                        └─ teks bebas → 1× LLM (JSON) → validasi zod → Supabase

Browser ──▶ Next.js (server components + server actions) ──▶ Supabase

Vercel Cron 08:00 WIB ──▶ /api/cron/daily
                        ├─ pengingat & kedaluwarsa trial (email)
                        └─ Premium → masa tenggang (3 hari) → berakhir
```

Akses ditentukan oleh `profiles.subscription_status`:

| Status | Web | Bot |
|---|---|---|
| `trial`, `premium`, `grace_period` | Akses penuh | Mencatat |
| `trial_expired`, `cancelled` | Lihat data; maks 5 transaksi manual/hari, tanpa export & kategori kustom | Menolak dengan pesan perpanjang |

Saat `NEXT_PUBLIC_FREE_PROMO=true`, semua user mendapat akses penuh.

## Menjalankan secara lokal

Butuh Node.js 20+.

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya (lihat tabel di bawah)
npm run dev                  # http://localhost:3000
```

Perintah lain: `npm run build`, `npm run lint`.

> Jangan memanggil `/api/cron/daily` dari lokal. Tanpa `NEXT_PUBLIC_FREE_PROMO`
> di `.env.local`, cron akan mengubah status user di database produksi dan
> mengirim email sungguhan.

## Environment variables

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Dipakai webhook bot, cron, dan admin (server saja) |
| `NEXT_PUBLIC_APP_URL` | ✓ | Mis. `https://www.catetinduit.de`, untuk link di email & pesan bot |
| `TELEGRAM_BOT_TOKEN` | ✓ | Token dari BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | ✓ | Secret header webhook (`openssl rand -hex 32`) |
| `LLM_BASE_URL` | ✓ | Endpoint OpenAI-compatible, mis. `https://kenari.id/v1` |
| `LLM_API_KEY` | ✓ | Kunci LLM |
| `LLM_MODEL` | ✓ | Mis. `deepseek-v4-1-flash` |
| `CRON_SECRET` | ✓ | Otorisasi cron & endpoint setup webhook |
| `RESEND_API_KEY` | ✓ | Kirim email |
| `EMAIL_FROM` | ✓ | Pengirim email, domain harus terverifikasi di Resend |
| `NEXT_PUBLIC_FREE_PROMO` | – | `true` = semua user gratis akses penuh. Ubah → wajib redeploy |
| `USER_DEFAULT_TIMEZONE` | – | Default `Asia/Jakarta` |
| `SENTRY_AUTH_TOKEN` | – | Upload source map saat build |
| `DUITKU_API_KEY`, `DUITKU_MERCHANT_CODE` | – | Hanya jika pembayaran otomatis Duitku diaktifkan |

## Deploy

1. Push ke `master`. Vercel otomatis build & deploy ke produksi.
2. Env di atas diset di Vercel → Settings → Environment Variables.
3. Cron terdaftar otomatis dari `vercel.json` (Settings → Cron Jobs).
4. Daftarkan webhook Telegram sekali setelah deploy pertama:
   ```bash
   curl -X POST "https://www.catetinduit.de/api/webhooks/telegram/setup?secret=$CRON_SECRET"
   ```
5. Migrasi database dijalankan manual lewat Supabase SQL Editor, lihat
   [`supabase/migrations/README.md`](supabase/migrations/README.md).

Operasional (promo, aktivasi Premium, webhook, VM healthcheck) ada di
[`ops/RUNBOOK.md`](ops/RUNBOOK.md).

## Pengujian

Suite bot di [`test/telegram/`](test/telegram/README.md) berjalan terhadap
Supabase produksi dan membersihkan data ujinya sendiri:

- `suite.mjs`: 34 kasus (flow user baru, connect, idempotensi, edge case)
- `parse-suite.mjs`: 16 kasus parser LLM (butuh `LLM_*`)

Jalankan sebelum deploy perubahan yang menyentuh `src/lib/telegram/`.

## Struktur

```
src/
  app/
    page.tsx                 landing
    (auth)/                  masuk, daftar, lupa password
    (dashboard)/dashboard/   beranda, transaksi, kategori, telegram, langganan, pengaturan
    admin/                   panel admin
    api/                     webhook Telegram, cron, connect, export CSV, dll.
  components/                shell dashboard, landing, auth, komponen UI
  lib/
    telegram/                handler bot, parser LLM, klien Telegram API
    constants.ts             harga, batas akses, promo, status langganan
supabase/migrations/         SQL migrasi (manual)
test/telegram/               suite pengujian bot
ops/                         runbook & script pemeliharaan VM
```
