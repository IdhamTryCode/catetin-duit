import { NextRequest, NextResponse } from 'next/server'
import { safeEqual } from '@/lib/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Kelola pendaftaran webhook Telegram.
 *
 * Dilindungi CRON_SECRET supaya tidak sembarang orang bisa mengalihkan
 * atau mematikan webhook produksi.
 *
 *   GET    ?secret=...          → lihat status webhook saat ini
 *   POST   ?secret=...          → daftarkan webhook ke route ini
 *   DELETE ?secret=...          → hapus webhook (kembali ke long-polling VM)
 *
 * DELETE adalah jalur rollback: begitu webhook dihapus, gateway OpenClaw di
 * VM kembali menerima update lewat long-polling seperti sebelumnya.
 */

function auth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const provided =
    request.nextUrl.searchParams.get('secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return !!provided && safeEqual(provided, secret)
}

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null
}

export async function GET(request: NextRequest) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const t = token()
  if (!t) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN belum diset' }, { status: 500 })

  const res = await fetch(`https://api.telegram.org/bot${t}/getWebhookInfo`)
  return NextResponse.json(await res.json())
}

export async function POST(request: NextRequest) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const t = token()
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!t || !webhookSecret || !appUrl) {
    return NextResponse.json(
      { error: 'Butuh TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, dan NEXT_PUBLIC_APP_URL' },
      { status: 500 },
    )
  }

  const url = `${appUrl.replace(/\/$/, '')}/api/webhooks/telegram`

  const res = await fetch(`https://api.telegram.org/bot${t}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: webhookSecret,
      // Hanya pesan biasa. Sebelumnya bot berlangganan semua jenis update
      // (business_message, poll_answer, chat_boost, ...) tanpa satu pun dipakai.
      allowed_updates: ['message'],
      // Update yang menumpuk selama peralihan tidak perlu diproses ulang.
      drop_pending_updates: true,
    }),
  })

  return NextResponse.json({ url, telegram: await res.json() })
}

export async function DELETE(request: NextRequest) {
  if (!auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const t = token()
  if (!t) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN belum diset' }, { status: 500 })

  const res = await fetch(`https://api.telegram.org/bot${t}/deleteWebhook`, { method: 'POST' })
  return NextResponse.json({ deleted: true, telegram: await res.json() })
}
