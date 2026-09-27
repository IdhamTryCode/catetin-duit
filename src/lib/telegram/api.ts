/**
 * Pembungkus tipis Telegram Bot API.
 */

const API = 'https://api.telegram.org'

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN belum diset')
  return t
}

async function call(method: string, payload: unknown, timeoutMs = 10_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API}/bot${token()}/${method}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function sendMessage(chatId: number, text: string) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  })
}

/**
 * Indikator "sedang mengetik". Telegram menampilkannya ~5 detik.
 * Dipanggil sebelum kerja berat supaya bot tidak terasa mati.
 */
export async function sendTyping(chatId: number) {
  try {
    await call('sendChatAction', { chat_id: chatId, action: 'typing' }, 5_000)
  } catch {
    // Indikator mengetik tidak pernah boleh menggagalkan pemrosesan pesan.
  }
}

export interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    chat: { id: number }
    from?: { id: number; is_bot?: boolean; first_name?: string }
    text?: string
    date: number
  }
}
