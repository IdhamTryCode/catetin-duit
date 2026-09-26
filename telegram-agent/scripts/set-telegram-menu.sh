#!/usr/bin/env bash
# set-telegram-menu.sh
#
# Pasang menu command Telegram untuk Catetin Duit.
#
# Kenapa perlu: commands.native=false membuat OpenClaw MENGHAPUS seluruh menu
# saat gateway start — termasuk skill kita. Itu memang disengaja, karena kalau
# native=true menu akan terisi 56 command bawaan (/exec, /restart, /tmux, ...)
# yang bisa dipanggil siapa saja. Menu Telegram sendiri cuma petunjuk visual:
# command tetap berfungsi lewat parsing teks (commands.text=true), jadi kita
# isi menunya sendiri di sini.
#
# Dipanggil otomatis lewat systemd ExecStartPost, bisa juga manual.
#
# PENTING: di systemd, panggil lewat `ExecStartPost=/bin/bash -c '... &'`
# (background). ExecStartPost menahan startup, sedangkan TimeoutStartSec
# gateway hanya 30 detik — kalau script ini blocking, systemd membunuh
# gateway yang sebenarnya sudah ready.

set -euo pipefail

CONFIG="${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"

TOKEN=$(grep -oP '"botToken":\s*"\K[^"]+' "$CONFIG" | head -1)
if [ -z "${TOKEN:-}" ]; then
  echo "ERROR: botToken tidak ditemukan di $CONFIG" >&2
  exit 1
fi

# Tunggu gateway selesai membersihkan menu, supaya tidak tertimpa.
sleep "${MENU_DELAY:-45}"

read -r -d '' PAYLOAD <<'JSON' || true
{"commands":[
{"command":"connect","description":"Hubungkan akun web (/connect KODE)"},
{"command":"riwayat","description":"5 transaksi terakhir"},
{"command":"ringkasan","description":"Ringkasan keuangan bulan ini"},
{"command":"bantuan","description":"Panduan pemakaian"}
]}
JSON

RESP=$(curl -s -m 20 -X POST \
  "https://api.telegram.org/bot${TOKEN}/setMyCommands" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")

echo "setMyCommands: $RESP"

case "$RESP" in
  *'"ok":true'*) exit 0 ;;
  *) echo "ERROR: gagal memasang menu" >&2; exit 1 ;;
esac
