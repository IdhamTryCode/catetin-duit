# Migrasi Supabase

Proyek ini tidak memakai Supabase CLI. Migrasi dijalankan manual lewat
**SQL Editor** di dashboard Supabase.

## Cara menjalankan

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → pilih proyek
   Catetin Duit.
2. Menu kiri → **SQL Editor** → **New query**.
3. Salin seluruh isi file `.sql`, tempel, lalu klik **Run** (atau Ctrl+Enter).
4. Pastikan hasilnya `Success. No rows returned`.

Semua migrasi di folder ini idempoten (`IF NOT EXISTS`), jadi aman kalau
tidak sengaja dijalankan dua kali.

---

## 20260926_telegram_webhook.sql

Pendukung webhook Telegram: kolom `dedupe_key` untuk idempotensi, plus
beberapa unique index.

### ⚠️ Jalankan pengecekan ini DULU

Migrasi membuat unique index pada `profiles.telegram_chat_id`. Kalau di
database sudah terlanjur ada satu chat Telegram yang menempel ke lebih dari
satu akun, perintah itu **akan gagal**. Cek dulu:

```sql
-- Harus mengembalikan 0 baris.
SELECT telegram_chat_id, count(*) AS jumlah, array_agg(id) AS profil
FROM public.profiles
WHERE telegram_chat_id IS NOT NULL
GROUP BY telegram_chat_id
HAVING count(*) > 1;
```

**Kalau 0 baris** → langsung jalankan migrasinya.

**Kalau ada baris** → tentukan dulu akun mana yang benar untuk tiap chat_id,
lalu kosongkan sisanya. Contoh (ganti UUID dengan yang mau dilepas):

```sql
UPDATE public.profiles
SET telegram_chat_id = NULL
WHERE id = '<uuid-profil-yang-salah>';
```

Ulangi pengecekan sampai 0 baris, baru jalankan migrasi.

Cek serupa untuk kode connect (biasanya kosong):

```sql
SELECT code, count(*) FROM public.connect_codes
GROUP BY code HAVING count(*) > 1;
```

Kalau ada, hapus yang sudah terpakai/kadaluarsa:

```sql
DELETE FROM public.connect_codes a
USING public.connect_codes b
WHERE a.code = b.code AND a.id <> b.id AND a.created_at < b.created_at;
```

### Verifikasi setelah migrasi

```sql
-- Kolom dedupe_key ada?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'dedupe_key';

-- Keempat index terbentuk?
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'transactions_dedupe_key_uidx',
    'profiles_telegram_chat_id_uidx',
    'connect_codes_code_uidx',
    'profiles_telegram_chat_id_idx'
  );
```

Yang kedua harus mengembalikan 4 baris.

---

## 20260928_app_settings.sql

Membuat tabel `app_settings` untuk halaman **Admin → Pengaturan** (promo +
tanggal berakhir, harga Premium, masa tenggang) dan status run cron terakhir
di **Admin → Sistem**. RLS aktif tanpa policy, jadi hanya server (service role)
yang bisa membaca/menulis.

Sebelum migrasi ini dijalankan aplikasi tetap berjalan normal dengan nilai
default (env `NEXT_PUBLIC_FREE_PROMO`, harga & masa tenggang dari kode); hanya
penyimpanan pengaturan yang belum bisa.

---

## 20261001_protect_profiles.sql — KEAMANAN, wajib

Menutup celah eskalasi hak akses: sebelumnya user bisa mengubah `role`,
`subscription_status`, dan tanggal trial/Premium di baris profilnya sendiri
lewat API Supabase langsung (RLS membatasi baris, bukan kolom). Trigger
`protect_profile_columns` mengunci kolom itu untuk request ber-JWT user dan
melarang user menghapus profilnya; server (service role) tidak terpengaruh.
Juga mencabut hak tulis langsung user pada `payments` dan `audit_logs`.

Verifikasi setelah dijalankan (sebagai user biasa, dari konsol browser atau
skrip): `update profiles set role = 'admin'` pada baris sendiri tidak
mengubah apa pun.
