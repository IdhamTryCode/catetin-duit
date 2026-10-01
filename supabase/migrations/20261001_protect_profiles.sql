-- KEAMANAN (kritis): cegah user menaikkan hak aksesnya sendiri.
--
-- Sebelum migrasi ini, policy RLS mengizinkan user meng-UPDATE seluruh kolom
-- baris profilnya sendiri. Lewat API Supabase langsung (tanpa lewat web) user
-- bisa menjalankan, misalnya:
--   update profiles set role = 'admin', subscription_status = 'premium' where id = auth.uid()
-- lalu membaca data semua user sebagai admin.
--
-- RLS hanya membatasi BARIS, bukan KOLOM. Trigger di bawah mengunci kolom
-- sensitif untuk request yang datang dengan JWT user (role authenticated/anon).
-- Server (service_role), SQL Editor, dan trigger signup tidak terpengaruh.
--
-- Idempoten: aman dijalankan ulang.

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
BEGIN
  -- Bukan request user (service_role / tanpa JWT) → tidak dibatasi.
  IF jwt_role NOT IN ('authenticated', 'anon') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Hapus + buat ulang profil bisa dipakai untuk mereset trial / role.
    RAISE EXCEPTION 'Profil tidak bisa dihapus langsung' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Profil normalnya dibuat trigger signup. Kalau user membuatnya sendiri,
    -- paksa nilai awal yang aman.
    NEW.role := 'user';
    NEW.plan := 'free';
    NEW.subscription_status := 'trial';
    NEW.trial_started_at := now();
    NEW.trial_ends_at := now() + interval '7 days';
    NEW.subscription_started_at := NULL;
    NEW.subscription_ends_at := NULL;
    NEW.grace_period_ends_at := NULL;
    NEW.telegram_chat_id := NULL;
    NEW.deleted_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE oleh user: kolom berikut selalu dikembalikan ke nilai lama.
  NEW.id := OLD.id;
  NEW.email := OLD.email;
  NEW.role := OLD.role;
  NEW.plan := OLD.plan;
  NEW.subscription_status := OLD.subscription_status;
  NEW.trial_started_at := OLD.trial_started_at;
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.subscription_started_at := OLD.subscription_started_at;
  NEW.subscription_ends_at := OLD.subscription_ends_at;
  NEW.grace_period_ends_at := OLD.grace_period_ends_at;
  NEW.deleted_at := OLD.deleted_at;
  NEW.created_at := OLD.created_at;

  -- Telegram: user hanya boleh MEMUTUS (set NULL). Menghubungkan dilakukan bot
  -- lewat /connect, supaya user tidak bisa mengklaim chat_id orang lain.
  IF NEW.telegram_chat_id IS NOT NULL AND NEW.telegram_chat_id IS DISTINCT FROM OLD.telegram_chat_id THEN
    NEW.telegram_chat_id := OLD.telegram_chat_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_columns ON public.profiles;
CREATE TRIGGER protect_profile_columns
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

-- Tabel yang hanya boleh ditulis server. Admin panel memakai service_role,
-- jadi user (termasuk yang ber-role admin) tidak perlu hak tulis langsung:
-- mencegah catatan pembayaran palsu dan penghapusan jejak audit.
REVOKE INSERT, UPDATE, DELETE ON public.payments   FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;
