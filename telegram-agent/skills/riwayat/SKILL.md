---
name: riwayat
description: Show the user's last 5 financial transactions when they send /riwayat command
user-invocable: true
---

# get-history

Use this skill when the user sends `/riwayat`.

## When to activate

- Message is exactly `/riwayat`
- Message starts with `/riwayat`

## How to run

```bash
node /home/ubuntu/openclaw/catetin-duit-agent/scripts/get-history.js "{telegramChatId}"
```

## Output

The script prints a formatted list of recent transactions. Send that to the user.

If the script exits with code 1, reply: "❌ Gagal mengambil data transaksi. Coba lagi ya."
