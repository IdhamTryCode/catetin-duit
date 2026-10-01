-- Pembatas laju (rate limit) yang tersimpan di database, dipakai server untuk
-- login, daftar, lupa password, kirim ulang konfirmasi, dan pesan bot.
-- Di serverless, hitungan di memori tidak dibagi antar instance; tabel ini
-- membuat batasnya konsisten.
--
-- Jendela tetap (fixed window): hitungan direset setelah p_window_seconds.
-- Idempoten: aman dijalankan ulang.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           text PRIMARY KEY,
  window_start  timestamptz NOT NULL DEFAULT now(),
  count         integer NOT NULL DEFAULT 0
);

-- Tanpa policy: hanya service role (server) yang bisa mengakses.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Catat 1 percobaan untuk p_key. Mengembalikan true jika masih dalam batas.
-- Satu pernyataan atomik, jadi aman terhadap request bersamaan.
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO rate_limits AS r (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count        = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.count + 1 END,
    window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE r.window_start END
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
