#!/bin/bash
# ============================================================
# keepalive-supabase.sh
# Ping ringan ke Supabase REST agar project free-tier tidak
# di-pause karena tidak ada aktivitas (limit 7 hari).
# Dipanggil oleh cron (harian). Aman dijalankan kapan saja.
#
# Tahan-gagal: mencoba beberapa kali dengan jeda sebelum menyerah,
# supaya blip jaringan sesaat tidak menyebabkan "hari tanpa aktivitas".
# ============================================================
set -u

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$DIR/.env"
LOG="$DIR/scripts/keepalive.log"

ATTEMPTS=5          # jumlah percobaan
SLEEP_BETWEEN=15    # jeda antar percobaan (detik)
MAX_TIME=30         # timeout per request (detik)

# Load SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY dari .env
if [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi

ts() { date '+%Y-%m-%d %H:%M:%S %z'; }

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "$(ts) ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ada di .env" >> "$LOG"
  exit 1
fi

last_code="000"
for i in $(seq 1 "$ATTEMPTS"); do
  # Query super ringan: ambil 1 id dari profiles (cukup dihitung sebagai aktivitas DB)
  last_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$MAX_TIME" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/rest/v1/profiles?select=id&limit=1")

  if [ "$last_code" = "200" ]; then
    echo "$(ts) OK (HTTP 200) — keep-alive sukses (percobaan $i/$ATTEMPTS)" >> "$LOG"
    exit 0
  fi

  # Belum berhasil — tunggu lalu coba lagi (kecuali percobaan terakhir)
  [ "$i" -lt "$ATTEMPTS" ] && sleep "$SLEEP_BETWEEN"
done

echo "$(ts) FAIL (HTTP $last_code) — GAGAL setelah $ATTEMPTS percobaan. DB mungkin paused / jaringan bermasalah." >> "$LOG"
exit 1
