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

## Observability

### Log persisten

Log gateway ada di `~/openclaw-logs/gateway.log` (`logging.file` di
`openclaw.json`). **Jangan kembalikan ke default** — default `/tmp/openclaw`
dipangkas OpenClaw setelah 24 jam dan hilang saat reboot, sehingga laporan
pengguna tidak bisa ditelusuri keesokan harinya.

OpenClaw tidak merotasi path kustom, jadi rotasi diurus `scripts/rotate-logs.sh`
(logrotate user-level, `copytruncate` karena gateway memegang file handle
terbuka; simpan 14 hari, maks 50 MB per file).

```bash
tail -f ~/openclaw-logs/gateway.log
grep -i error ~/openclaw-logs/gateway.log | tail -30
```

### Healthcheck + alert Telegram

`scripts/healthcheck.sh` berjalan tiap 10 menit dan mengirim peringatan ke
chat owner kalau menemukan: service mati, restart ≥3x, OOM dalam 1 jam,
RAM <150 MB, disk >90%, Telegram API tak menjawab, atau Supabase tak
terjangkau. Peringatan di-throttle 1 jam per jenis masalah agar tidak spam
saat crash-loop.

Jalankan manual: `bash ~/openclaw/catetin-duit-agent/scripts/healthcheck.sh`
(exit 0 = sehat, 1 = ada masalah). Riwayat: `~/openclaw-logs/healthcheck.log`.

### Cron terpasang

```
0  3 * * *  keepalive-supabase.sh     # jaga Supabase free-tier
0  4 * * *  rotate-logs.sh            # rotasi log
*/10 * * * * healthcheck.sh           # monitoring + alert
```

### Typing indicator

`agents.entries.catetin-duit.typingMode: "instant"` +
`agents.defaults.typingIntervalSeconds: 6`. Latensi 5–10 detik terasa seperti
bot mati; indikator mengetik membuatnya terasa hidup. Diset eksplisit supaya
tidak hilang saat `doctor --fix`. Catatan: `typingIntervalSeconds` hanya valid
di `agents.defaults`, bukan per-agent — schema menolaknya.

## Peralihan ke webhook (langkah 5)

Jalur baru: `Telegram webhook -> /api/webhooks/telegram` di Vercel.
LLM hanya mengurai teks jadi JSON (satu panggilan, divalidasi zod); perintah
dan penyimpanan dikerjakan kode biasa. Tidak ada shell, tidak ada agent loop.

**Belum aktif sampai `setWebhook` dijalankan.** Selama belum, VM tetap
melayani lewat long-polling seperti biasa.

### Urutan aktivasi

1. Jalankan `supabase/migrations/20260926_telegram_webhook.sql` di Supabase
   SQL Editor. Kalau index unik `profiles_telegram_chat_id_uidx` gagal,
   berarti ada chat_id ganda — periksa dengan query di komentar file itu.

2. Set environment variable di Vercel (Production):

   ```
   TELEGRAM_BOT_TOKEN=<token BotFather>
   TELEGRAM_WEBHOOK_SECRET=<acak, mis. openssl rand -hex 32>
   LLM_BASE_URL=https://kenari.id/v1
   LLM_API_KEY=<kunci kenari>
   LLM_MODEL=deepseek-v4-1-flash
   FREE_PROMO=true
   USER_DEFAULT_TIMEZONE=Asia/Jakarta
   ```

   `SUPABASE_SERVICE_ROLE_KEY` dan `NEXT_PUBLIC_APP_URL` sudah ada.

3. Deploy, lalu matikan channel Telegram di VM supaya tidak ada dua pembaca:

   ```bash
   openclaw gateway call channels.stop --params '{"channel":"telegram"}'
   ```

4. Daftarkan webhook:

   ```bash
   curl -X POST "https://catetin-duit.vercel.app/api/webhooks/telegram/setup?secret=$CRON_SECRET"
   curl "https://catetin-duit.vercel.app/api/webhooks/telegram/setup?secret=$CRON_SECRET"   # cek status
   ```

5. Tes dari Telegram: `/bantuan`, `/riwayat`, `beli kopi 25rb`.

### Rollback

```bash
curl -X DELETE "https://catetin-duit.vercel.app/api/webhooks/telegram/setup?secret=$CRON_SECRET"
openclaw gateway call channels.start --params '{"channel":"telegram"}'
```

Begitu webhook dihapus, long-polling OpenClaw kembali menerima update.
Tidak ada data yang hilang; kedua jalur menulis ke tabel yang sama.

### Hasil pengukuran (27 Sep 2026)

| | Jalur lama | Webhook |
|---|---|---|
| Latensi | 10 s (median) | ~1.7 s |
| Panggilan LLM per pesan | 2-3 | 1 |
| Service role key di VM | ya | tidak |

Parser diuji 6 kasus (termasuk `beli nasi di warung 'bu tini' 20rb` yang
dulu merusak shell) dan handler diuji 17 assertion terhadap Supabase nyata.

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
