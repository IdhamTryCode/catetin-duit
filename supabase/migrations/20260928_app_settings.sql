-- Pengaturan aplikasi yang bisa diubah admin dari web (tanpa redeploy).
-- Kunci yang dipakai kode (src/lib/settings.ts):
--   promo          {"enabled": bool, "until": "YYYY-MM-DD" | null}
--   premium_price  number (IDR per bulan)
--   grace_days     number (hari masa tenggang setelah Premium berakhir)
--   cron_last_run  {"at": ISO, "results": {...}}  (ditulis /api/cron/daily)
-- Tanpa baris untuk sebuah kunci, aplikasi memakai nilai default dari env/kode.

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Hanya service role (server) yang membaca/menulis. Tanpa policy = anon &
-- authenticated tidak punya akses sama sekali.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
