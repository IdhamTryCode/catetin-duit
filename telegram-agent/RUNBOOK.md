# Runbook — Catetin Duit Telegram Agent

Catatan operasional VM. Dibuat 26 Sep 2026 setelah insiden OOM.

## Arsitektur singkat

```
Telegram → OpenClaw gateway → agent "catetin-duit" (LLM)
         → LLM menulis command bash → node scripts/*.js → Supabase
```

Agent dikunci: `profile: minimal` + `alsoAllow: ["exec"]`, `deny: [gateway,
automations, plugins]`. Hanya `exec` yang tersedia — dipakai untuk memanggil
script di `scripts/`.

## Insiden: OOM kill berulang (26 Sep 2026)

**Gejala.** Bot tidak membalas. Pengguna menerima pesan berulang
"I'm continuing your interrupted request now (the gateway has just
restarted)". Transaksi kadang tersimpan, kadang tidak.

**Penyebab.** VM hanya 1.9 GB RAM. Setelah update ke OpenClaw 2026.9.6,
gateway memuat **15 plugin** (sebelumnya 2) dan memuncak >1 GB. Kernel
membunuhnya 16× dalam sehari.

**Perbaikan.**

1. Matikan plugin tak terpakai di `~/.openclaw/openclaw.json`. Bot ini hanya
   butuh `telegram` + `openai` (untuk provider kenari yang openai-compatible):

   ```json
   "plugins": { "entries": {
     "anthropic": {"enabled": false}, "browser": {"enabled": false},
     "canvas": {"enabled": false}, "cua-computer": {"enabled": false},
     "device-pair": {"enabled": false}, "file-transfer": {"enabled": false},
     "geolocation": {"enabled": false}, "github": {"enabled": false},
     "linux-node": {"enabled": false}, "ollama": {"enabled": false},
     "talk-voice": {"enabled": false}, "xai": {"enabled": false},
     "memory-core": {"enabled": false}
   }}
   ```

   Hasil: 15 → 2 plugin, RSS ~1.1 GB → ~460 MB.

2. Drop-in systemd `~/.config/systemd/user/openclaw-gateway.service.d/20-memory.conf`:

   ```ini
   [Service]
   OOMScoreAdjust=-500
   Environment=OPENCLAW_NO_RESPAWN=1
   Environment=NODE_OPTIONS=--max-old-space-size=420
   ```

   `OPENCLAW_NO_RESPAWN=1` penting: tanpa itu gateway me-respawn diri dan
   proses anak kehilangan env dari systemd.

**Verifikasi.**

```bash
journalctl --user -u openclaw-gateway --since today | grep -c oom-kill   # harus 0
systemctl --user show openclaw-gateway -p NRestarts --value              # harus 0
ps -o rss= -p $(pgrep -f "dist/index.js gateway" | head -1) | awk '{print int($1/1024)" MB"}'
```

**Rekomendasi.** Upgrade VM ke 4 GB. Dengan 1.9 GB, margin terlalu tipis —
satu lonjakan trafik bisa memicu OOM lagi.

## Menu command Telegram

`commands.native: false` membuat OpenClaw **mengosongkan** menu tiap start
(itu disengaja: `native: true` mengisi menu dengan 56 command bawaan seperti
`/exec`, `/restart`, `/tmux` yang bisa dipanggil pengguna mana pun).

Menu diisi sendiri lewat `scripts/set-telegram-menu.sh`, dipasang otomatis
oleh drop-in `10-telegram-menu.conf`. **Harus background (`&`)** — versi
blocking membuat systemd membunuh gateway saat `TimeoutStartSec` 30 detik
terlewat.

## Setelah update OpenClaw

`doctor --fix` pernah menyalakan ulang `tools.elevated`. Selalu jalankan:

```bash
openclaw security audit
TOKEN=$(grep -oP '"botToken":\s*"\K[^"]+' ~/.openclaw/openclaw.json)
curl -s "https://api.telegram.org/bot$TOKEN/getMyCommands" | python3 -m json.tool
```

Menu harus berisi **hanya** 4 command Catetin Duit.

## Keterbatasan yang diketahui (belum diperbaiki)

1. **LLM bisa mengarang balasan.** Terbukti 26 Sep: `/bantuan` membalas
   "3 transaksi terakhir" padahal semua file menulis "5" — model memparafrase
   alih-alih merelay output script. Risiko yang sama berlaku untuk pencatatan:
   bot bisa bilang "berhasil dicatat" tanpa ada yang tersimpan.
2. **Shell quoting rapuh.** JSON dan pesan mentah dilewatkan sebagai argumen
   ber-single-quote. Pesan seperti `beli nasi di warung 'bu tini' 20rb`
   merusak command.
3. **Tidak ada idempotensi.** Kalau script jalan dua kali, transaksi dobel.

Ketiganya berakar pada satu hal: hot-path dijalankan oleh LLM yang menyusun
command shell. Penyelesaian sebenarnya adalah memindahkannya ke service bot
sendiri (webhook → satu panggilan LLM untuk parsing → tulis Supabase), dan
memindahkan service role key dari VM ke backend Next.js.
