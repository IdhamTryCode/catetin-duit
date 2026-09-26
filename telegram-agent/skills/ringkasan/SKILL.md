---
name: ringkasan
description: Show the user's financial summary for the current month when they send /ringkasan command
user-invocable: true
---

# get-summary

Use this skill when the user sends `/ringkasan`.

## When to activate

- Message is exactly `/ringkasan`
- Message starts with `/ringkasan`

## How to run

```bash
node /home/ubuntu/openclaw/catetin-duit-agent/scripts/get-summary.js "{telegramChatId}"
```

## Output

The script prints a formatted monthly summary. Send that to the user.

If the script exits with code 1, reply: "❌ Gagal mengambil data ringkasan. Coba lagi ya."
