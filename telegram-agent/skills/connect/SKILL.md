---
name: connect
description: Handle /connect and /start commands to link a Telegram chat_id to a web account using a 6-character connect code from the dashboard
user-invocable: true
---

# connect-telegram

Use this skill when the user sends `/connect KODE` or `/start KODE` in Telegram.

## When to activate

- Message starts with `/connect` followed by a code
- Message starts with `/start` followed by a code (deep link)
- Message is just `/start` (show welcome instructions)

## Deciding what counts as a code

A connect code is **exactly 6 characters, A-Z and 0-9 only** (uppercase it
before use). Anything else is NOT a code.

- `/start` alone → show the welcome instructions below.
- `/start connect` → this is the old dashboard deep link, **not** a code.
  Treat it exactly like `/start` alone.
- `/start ABC123` → run the script with `ABC123`.
- `/connect ABC123` → run the script with `ABC123`.
- `/connect` with something that is not 6 alphanumeric characters → do not
  run the script. Reply:
  `❌ Kode harus 6 karakter (huruf & angka). Ambil kode baru di {APP_URL}/dashboard/telegram`

## How to handle `/start` with no code

Reply with:
```
Halo! 👋 Selamat datang di Catetin Duit.

Untuk menghubungkan akun, ikuti langkah ini:
1. Daftar atau login di: {APP_URL}/register
2. Buka halaman Telegram di dashboard
3. Salin kode 6 karakter yang muncul
4. Kirim ke sini: /connect KODE_KAMU

Belum punya akun? Daftar gratis di: {APP_URL}/register
```

## How to handle `/connect KODE`

Run the connect script:

```bash
node /home/ubuntu/openclaw/catetin-duit-agent/scripts/connect-telegram.js "{telegramChatId}" "{code}"
```

Where:
- `{telegramChatId}` = the sender's Telegram chat ID (number)
- `{code}` = the 6-character code extracted from the message (uppercase)

## Output

The script will print the reply message to stdout. Send that as the Telegram reply.

If the script exits with code 1, send an error message: "❌ Terjadi kesalahan teknis. Coba lagi beberapa saat."
