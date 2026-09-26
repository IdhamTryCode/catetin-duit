---
name: save-transaction
description: Process AI response and save to Supabase — handles transactions, category creation, and non-financial messages
user-invocable: false
---

# save-transaction

Use this skill after generating a JSON response from the user's message.

## Step 1: Generate JSON response based on message type

### If user is recording a transaction:
```json
{
  "action": "save_transactions",
  "transactions": [
    {"type": "expense", "amount": 35000, "category": "Makanan & Minuman", "description": "Makan siang", "confidence": 0.95, "date_offset": -1}
  ]
}
```

Optional per transaction: `date_offset` (integer, e.g. -1 for "kemarin") or `transaction_date` (`YYYY-MM-DD`). Omit both for "today".

### If user wants to add a new category:
Triggered by: "tambah kategori", "buat kategori", "kategori baru", "daftarkan kategori"
```json
{
  "action": "create_category",
  "name": "Hiburan",
  "type": "expense",
  "icon": "🎮"
}
```

### If message is not financial:
```json
{
  "action": "non_financial",
  "message": "Hmm, aku tidak bisa mendeteksi transaksi dari pesan itu."
}
```

## Step 2: Run the script

```bash
node /home/ubuntu/openclaw/catetin-duit-agent/scripts/save-transaction.js "{telegramChatId}" '{jsonResponse}' '{rawMessage}'
```

Where:
- `{telegramChatId}` = sender's Telegram chat ID (number)
- `{jsonResponse}` = the JSON string from step 1 (single-quoted to avoid shell expansion)
- `{rawMessage}` = original user message

## Step 3: Send output to user

The script prints the reply message. Send it as the Telegram reply.

On exit code 1: send "❌ Terjadi kesalahan. Coba lagi beberapa saat."

## Notes

- The script handles all three action types internally
- Backward compatible: old format `{"transactions": [...]}` still works
- Category names are deduplicated — user can't create duplicates of existing ones
