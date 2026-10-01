import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendMessage, sendTyping, type TelegramUpdate } from '@/lib/telegram/api'
import { parseMessage } from '@/lib/telegram/parse'
import {
  MSG,
  findProfileByChatId,
  handleConnect,
  handleHistory,
  handleSummary,
  handleParsed,
  subscriptionBlocked,
} from '@/lib/telegram/handlers'
import { promoActive } from '@/lib/settings'
import { safeEqual } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/telegram
 *
 * Handler pesan Telegram. Menggantikan jalur lama (VM → OpenClaw → agent LLM
 * yang merangkai command shell → script node → Supabase).
 *
 * Perbedaan penting dari jalur lama:
 * - LLM hanya dipakai untuk mengurai teks bebas menjadi JSON, satu panggilan,
 *   hasilnya divalidasi zod. Ia tidak pernah menyusun balasan, sehingga tidak
 *   bisa mengarang "berhasil dicatat" untuk transaksi yang tidak tersimpan.
 * - Perintah (/start, /connect, /riwayat, /ringkasan, /bantuan) sepenuhnya
 *   deterministik, tidak menyentuh LLM sama sekali.
 * - Tidak ada shell, jadi pesan berisi tanda kutip tidak bisa merusak apa pun.
 * - Service role key tinggal di sini, bukan di VM.
 *
 * Keamanan: Telegram mengirim header secret yang diset saat setWebhook.
 * Request tanpa header yang cocok ditolak.
 *
 * Selalu balas 200 supaya Telegram tidak mengirim ulang update yang sama;
 * kegagalan dilaporkan ke pengguna lewat pesan, bukan lewat status HTTP.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || !safeEqual(request.headers.get('x-telegram-bot-api-secret-token') ?? '', secret)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const msg = update.message
  const chatId = msg?.chat?.id
  const text = msg?.text?.trim()

  if (!chatId || !text || msg?.from?.is_bot) {
    return NextResponse.json({ ok: true })
  }

  try {
    await handleUpdate(chatId, text, update)
  } catch (err) {
    console.error('[telegram] handler error:', err)
    try {
      await sendMessage(chatId, MSG.genericError)
    } catch {
      // Pengguna tidak terjangkau; sudah tercatat di log.
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleUpdate(chatId: number, text: string, update: TelegramUpdate) {
  const db = createAdminClient()

  const [rawCmd, ...rest] = text.split(/\s+/)
  const cmd = rawCmd.toLowerCase().replace(/@[\w_]+$/, '') // buang @namabot
  const arg = rest.join(' ')

  // /start dan /connect tidak butuh profil — justru untuk membuatnya.
  if (cmd === '/start' || cmd === '/connect') {
    await sendTyping(chatId)
    return sendMessage(chatId, await handleConnect(db, chatId, arg))
  }

  if (cmd === '/bantuan' || cmd === '/help') {
    return sendMessage(chatId, MSG.help)
  }

  const profile = await findProfileByChatId(db, chatId)
  // subscriptionBlocked() membaca env promo; promo dari Admin → Pengaturan dicek di sini
  // (dibaca sekali per pesan, hanya jika status user memang diblokir).
  const blocked = async (p: NonNullable<typeof profile>) => subscriptionBlocked(p) && !(await promoActive())
  if (!profile) {
    return sendMessage(chatId, MSG.notConnected)
  }

  if (cmd === '/riwayat') {
    await sendTyping(chatId)
    if (await blocked(profile)) return sendMessage(chatId, MSG.blocked)
    return sendMessage(chatId, await handleHistory(db, profile))
  }

  if (cmd === '/ringkasan') {
    await sendTyping(chatId)
    if (await blocked(profile)) return sendMessage(chatId, MSG.blocked)
    return sendMessage(chatId, await handleSummary(db, profile))
  }

  // Perintah tak dikenal — jangan diteruskan ke LLM sebagai transaksi.
  if (cmd.startsWith('/')) {
    return sendMessage(chatId, `❓ Perintah tidak dikenal.\n\n${MSG.help}`)
  }

  if (await blocked(profile)) {
    return sendMessage(chatId, MSG.blocked)
  }

  await sendTyping(chatId)

  const result = await parseMessage(text)
  if (!result.ok || !result.parsed) {
    console.error('[telegram] parse gagal:', result.error, `(${result.elapsedMs}ms)`)
    return sendMessage(chatId, MSG.cannotParse)
  }

  // Idempotensi: message_id unik per chat, jadi update yang terkirim dua kali
  // tidak menghasilkan transaksi ganda (lihat unique index dedupe_key).
  const dedupeKey = `tg:${chatId}:${update.message?.message_id ?? Date.now()}`

  const reply = await handleParsed(db, profile, result.parsed, text, dedupeKey)
  return sendMessage(chatId, reply)
}
