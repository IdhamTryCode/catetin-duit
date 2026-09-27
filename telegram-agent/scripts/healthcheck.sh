#!/usr/bin/env bash
# healthcheck.sh
#
# Cek kesehatan bot Catetin Duit dan kirim peringatan ke Telegram owner
# kalau ada yang salah.
#
# Sejak 27 Sep 2026 produksi dilayani webhook di Vercel, bukan gateway VM.
# Yang dipantau karena itu: webhook terdaftar & tanpa error, endpoint hidup,
# Telegram API menjawab, Supabase terjangkau. Kesehatan gateway OpenClaw
# tidak lagi menentukan apakah pengguna terlayani.
#
# Latar: 26 Sep 2026 gateway kena OOM kill 16x dan bot diam berjam-jam
# tanpa ada yang tahu — laporan baru datang dari pengguna. Script ini
# menutup celah itu.
#
# Dipanggil dari cron tiap 10 menit (lihat RUNBOOK).
# Peringatan di-throttle: maksimal 1 pesan per jam per jenis masalah,
# supaya tidak jadi spam saat crash-loop.

set -uo pipefail

# cron berjalan tanpa session bus, sehingga `systemctl --user` gagal dengan
# "Failed to connect to bus: No medium found". Tanpa ini, variabel state
# kosong dan script mengira gateway mati -> alert palsu tiap jam.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}"

CONFIG="${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"
OWNER_CHAT_ID="${OWNER_CHAT_ID:-914463371}"
APP_URL="${APP_URL:-https://catetin-duit.vercel.app}"
STATE_DIR="${HEALTHCHECK_STATE_DIR:-$HOME/openclaw-logs}"
THROTTLE_SECONDS="${THROTTLE_SECONDS:-3600}"

mkdir -p "$STATE_DIR"

TOKEN=$(grep -oP '"botToken":\s*"\K[^"]+' "$CONFIG" 2>/dev/null | head -1)

problems=()

# 1-3. Webhook Telegram: ini yang menentukan pengguna terlayani atau tidak.
if [ -z "${TOKEN:-}" ]; then
  problems+=("Bot token tidak terbaca dari config")
else
  WH=$(curl -s -m 20 "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" || true)

  case "$WH" in
    *'"url":"https://'*) : ;;
    *) problems+=("Webhook TIDAK terdaftar — pengguna tidak terlayani") ;;
  esac

  # Telegram melaporkan error pengiriman terakhir; kalau ada, endpoint bermasalah.
  err=$(printf '%s' "$WH" | grep -oP '"last_error_message":"\K[^"]*' || true)
  [ -n "$err" ] && problems+=("Webhook error: ${err}")

  # Antrian menumpuk = endpoint tidak menyerap update.
  pend=$(printf '%s' "$WH" | grep -oP '"pending_update_count":\K[0-9]+' || echo 0)
  [ "${pend:-0}" -gt 20 ] && problems+=("Webhook tertunda ${pend} update")
fi

# Endpoint webhook hidup? 401 = hidup & menolak request tanpa secret (benar).
code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 \
  -X POST "${APP_URL}/api/webhooks/telegram" \
  -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo 000)
case "$code" in
  401) : ;;
  000) problems+=("Endpoint webhook tidak terjangkau") ;;
  404) problems+=("Endpoint webhook 404 — deploy bermasalah") ;;
  *)   problems+=("Endpoint webhook balas HTTP ${code}") ;;
esac

# 4. RAM tersedia menipis?
avail=$(free -m | awk '/^Mem:/ {print $7}')
[ "${avail:-999}" -lt 150 ] && problems+=("RAM tersisa ${avail}MB")

# 5. Disk menipis?
diskpct=$(df --output=pcent /home | tail -1 | tr -dc '0-9')
[ "${diskpct:-0}" -gt 90 ] && problems+=("Disk terpakai ${diskpct}%")

# 7. Supabase terjangkau?
if [ -f "$HOME/openclaw/catetin-duit-agent/.env" ]; then
  # shellcheck disable=SC1091
  SUPABASE_URL=$(grep -oP '^SUPABASE_URL=\K.*' "$HOME/openclaw/catetin-duit-agent/.env" 2>/dev/null | tr -d '"' | head -1)
  if [ -n "${SUPABASE_URL:-}" ]; then
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "${SUPABASE_URL}/rest/v1/" 2>/dev/null || echo 000)
    # 200/401/404 = server hidup. 000 = tidak terjangkau.
    [ "$code" = "000" ] && problems+=("Supabase tidak terjangkau")
  fi
fi

if [ ${#problems[@]} -eq 0 ]; then
  echo "$(date -Is) OK"
  exit 0
fi

# Throttle per-jenis-masalah
key=$(printf '%s\n' "${problems[@]}" | sort | md5sum | cut -c1-12)
stamp="$STATE_DIR/.alert-$key"
now=$(date +%s)
if [ -f "$stamp" ]; then
  last=$(cat "$stamp" 2>/dev/null || echo 0)
  if [ $(( now - last )) -lt "$THROTTLE_SECONDS" ]; then
    echo "$(date -Is) MASALAH (peringatan di-throttle): ${problems[*]}"
    exit 1
  fi
fi
echo "$now" > "$stamp"

msg="🚨 *Catetin Duit — peringatan*%0A%0A"
for p in "${problems[@]}"; do
  msg="${msg}• ${p}%0A"
done
msg="${msg}%0A_$(date '+%d %b %Y %H:%M %Z')_"

if [ -n "${TOKEN:-}" ]; then
  curl -s -m 20 -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -d "chat_id=${OWNER_CHAT_ID}" \
    -d "parse_mode=Markdown" \
    -d "text=${msg}" > /dev/null || true
fi

echo "$(date -Is) MASALAH: ${problems[*]}"
exit 1
