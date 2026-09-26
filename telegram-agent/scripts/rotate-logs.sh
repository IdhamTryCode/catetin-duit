#!/usr/bin/env bash
# rotate-logs.sh
#
# Rotasi log gateway OpenClaw.
#
# Log default OpenClaw ada di /tmp/openclaw dan DIPANGKAS setelah 24 jam,
# jadi laporan pengguna tidak bisa diselidiki keesokan harinya. Config
# logging.file sekarang menunjuk ke ~/openclaw-logs/gateway.log yang
# persisten — tapi OpenClaw tidak merotasi path kustom, jadi kita sendiri
# yang mengurusnya di sini.
#
# Dipanggil dari cron (lihat RUNBOOK). Pakai logrotate user-level supaya
# tidak perlu sudo.

set -euo pipefail

LOG_DIR="${OPENCLAW_LOG_DIR:-$HOME/openclaw-logs}"
STATE="$LOG_DIR/.logrotate.state"
CONF="$LOG_DIR/.logrotate.conf"

mkdir -p "$LOG_DIR"

cat > "$CONF" <<EOF
$LOG_DIR/gateway.log {
    daily
    rotate 14
    maxsize 50M
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
}
EOF

# copytruncate penting: gateway memegang file handle terbuka. Tanpa itu,
# rotasi memindahkan inode dan gateway terus menulis ke file lama yang
# sudah tidak terlihat.
logrotate --state "$STATE" "$CONF"
