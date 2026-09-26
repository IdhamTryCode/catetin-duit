#!/usr/bin/env bash
# healthcheck.sh
#
# Cek kesehatan bot Catetin Duit dan kirim peringatan ke Telegram owner
# kalau ada yang salah.
#
# Latar: 26 Sep 2026 gateway kena OOM kill 16x dan bot diam berjam-jam
# tanpa ada yang tahu — laporan baru datang dari pengguna. Script ini
# menutup celah itu.
#
# Dipanggil dari cron tiap 10 menit (lihat RUNBOOK).
# Peringatan di-throttle: maksimal 1 pesan per jam per jenis masalah,
# supaya tidak jadi spam saat crash-loop.

set -uo pipefail

CONFIG="${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"
OWNER_CHAT_ID="${OWNER_CHAT_ID:-914463371}"
STATE_DIR="${HEALTHCHECK_STATE_DIR:-$HOME/openclaw-logs}"
THROTTLE_SECONDS="${THROTTLE_SECONDS:-3600}"

mkdir -p "$STATE_DIR"

TOKEN=$(grep -oP '"botToken":\s*"\K[^"]+' "$CONFIG" 2>/dev/null | head -1)

problems=()

# 1. Service systemd hidup?
state=$(systemctl --user is-active openclaw-gateway 2>/dev/null || true)
[ "$state" = "active" ] || problems+=("Gateway systemd: $state")

# 2. Restart beruntun? (indikasi crash-loop)
nrestarts=$(systemctl --user show openclaw-gateway -p NRestarts --value 2>/dev/null || echo 0)
[ "${nrestarts:-0}" -ge 3 ] && problems+=("Gateway restart ${nrestarts}x")

# 3. OOM dalam 1 jam terakhir?
ooms=$(journalctl --user -u openclaw-gateway --since "1 hour ago" --no-pager 2>/dev/null | grep -c "oom-kill" || true)
[ "${ooms:-0}" -gt 0 ] && problems+=("OOM kill ${ooms}x dalam 1 jam")

# 4. RAM tersedia menipis?
avail=$(free -m | awk '/^Mem:/ {print $7}')
[ "${avail:-999}" -lt 150 ] && problems+=("RAM tersisa ${avail}MB")

# 5. Disk menipis?
diskpct=$(df --output=pcent /home | tail -1 | tr -dc '0-9')
[ "${diskpct:-0}" -gt 90 ] && problems+=("Disk terpakai ${diskpct}%")

# 6. Bot Telegram benar-benar menjawab API?
if [ -n "${TOKEN:-}" ]; then
  if ! curl -s -m 15 "https://api.telegram.org/bot${TOKEN}/getMe" | grep -q '"ok":true'; then
    problems+=("Telegram getMe gagal")
  fi
fi

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
