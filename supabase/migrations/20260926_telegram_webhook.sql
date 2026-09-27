-- Migrasi pendukung webhook Telegram (langkah 5).
--
-- Jalankan di Supabase SQL Editor sebelum mengarahkan webhook ke Vercel.
-- Semua pernyataan idempoten, aman dijalankan ulang.

-- 1. Idempotensi transaksi -------------------------------------------------
-- Jalur lama tidak punya pelindung apa pun: kalau script jalan dua kali,
-- transaksi tersimpan dobel. Webhook Telegram BISA mengirim update yang sama
-- lebih dari sekali (misal saat timeout), jadi ini wajib.
--
-- Kuncinya "tg:<chatId>:<messageId>:<indeks>", unik per transaksi per pesan.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_dedupe_key_uidx
  ON public.transactions (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 2. Satu chat Telegram = satu akun ----------------------------------------
-- Tanpa ini, satu chat_id bisa menempel ke beberapa profil dan setiap query
-- pencarian profil berisiko mengembalikan banyak baris.
--
-- Kalau perintah ini gagal, berarti sudah ADA duplikat. Periksa dulu dengan:
--   SELECT telegram_chat_id, count(*) FROM public.profiles
--   WHERE telegram_chat_id IS NOT NULL
--   GROUP BY telegram_chat_id HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_chat_id_uidx
  ON public.profiles (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- 3. Kode connect tidak boleh bentrok --------------------------------------
-- Pencarian kode memakai kecocokan tunggal; kode ganda membuatnya ambigu.

CREATE UNIQUE INDEX IF NOT EXISTS connect_codes_code_uidx
  ON public.connect_codes (code);

-- 4. Percepat pencarian profil dari chat Telegram --------------------------
-- Dipanggil di setiap pesan masuk.

CREATE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx
  ON public.profiles (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;
