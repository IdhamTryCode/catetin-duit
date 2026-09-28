'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { addDays } from 'date-fns'
import { SUBSCRIPTION_DURATION_DAYS } from '@/lib/constants'
import { getSettings, saveSetting } from '@/lib/settings'
import { sendBroadcastEmail, sendPaymentSuccessEmail } from '@/lib/email'

/** Hasil action admin: `error` terisi jika gagal, selain itu data tambahan. */
type Result = { error?: string; success?: boolean } & Record<string, unknown>

/** Verify the calling user is an admin before performing any mutation. Returns the admin's user id. */
async function requireAdminUser(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return user.id
}

async function withAdmin(fn: (adminId: string) => Promise<Result>): Promise<Result> {
  let adminId: string
  try {
    adminId = await requireAdminUser()
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Unauthorized' }
  }
  return fn(adminId)
}

/** Catat aksi admin ke audit_logs. Gagal mencatat tidak membatalkan aksi. */
async function audit(adminId: string, action: string, recordId: string, oldValues: unknown, newValues: unknown, table = 'profiles') {
  const { error } = await createAdminClient().from('audit_logs').insert({
    user_id: adminId,
    action,
    table_name: table,
    record_id: recordId,
    old_values: (oldValues ?? null) as never,
    new_values: (newValues ?? null) as never,
  })
  if (error) console.error('[admin/audit]', action, error.message)
}

const PROFILE_FIELDS = 'id, email, full_name, subscription_status, trial_ends_at, subscription_started_at, subscription_ends_at, telegram_chat_id, role'

async function getProfile(userId: string) {
  const { data } = await createAdminClient().from('profiles').select(PROFILE_FIELDS).eq('id', userId).single()
  return data
}

async function updateProfile(adminId: string, userId: string, action: string, update: Record<string, unknown>): Promise<Result> {
  const before = await getProfile(userId)
  if (!before) return { error: 'User tidak ditemukan' }
  const { error } = await createAdminClient()
    .from('profiles')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) return { error: error.message }

  const oldValues = Object.fromEntries(Object.keys(update).map((k) => [k, (before as Record<string, unknown>)[k]]))
  await audit(adminId, action, userId, oldValues, update)
  revalidatePath('/admin', 'layout')
  return { success: true, before }
}

/** Tanggal berakhir Premium baru: ditambah dari tanggal berjalan (jika masih aktif) atau dari sekarang. */
function extendFrom(currentEnd: string | null | undefined, days: number) {
  const now = new Date()
  const cur = currentEnd ? new Date(currentEnd) : null
  return addDays(cur && cur > now ? cur : now, days).toISOString()
}

// ─── Status & role ──────────────────────────────────────────────────────────

const ADMIN_STATUSES = ['trial', 'premium', 'trial_expired', 'grace_period', 'cancelled'] as const

/**
 * Ubah status langganan user. Memilih 'premium' = aktivasi manual setelah
 * pembayaran via WhatsApp: diperpanjang SUBSCRIPTION_DURATION_DAYS dari
 * tanggal berakhir yang masih berjalan (atau dari sekarang).
 */
export async function adminUpdateUserStatus(formData: FormData) {
  return withAdmin(async (adminId) => {
    const userId = formData.get('user_id') as string
    const status = formData.get('status') as (typeof ADMIN_STATUSES)[number]

    if (!userId) return { error: 'user_id diperlukan' }
    if (!ADMIN_STATUSES.includes(status)) return { error: 'Status tidak valid' }

    const current = await getProfile(userId)
    const update: Record<string, unknown> = { subscription_status: status }
    if (status === 'premium') {
      update.subscription_ends_at = extendFrom(current?.subscription_ends_at, SUBSCRIPTION_DURATION_DAYS)
      if (current?.subscription_status !== 'premium') update.subscription_started_at = new Date().toISOString()
    }

    const res = await updateProfile(adminId, userId, 'admin.set_status', update)
    if (res.error) return res
    return { success: true, subscription_ends_at: (update.subscription_ends_at as string) ?? null }
  })
}

export async function adminUpdateUserRole(formData: FormData) {
  return withAdmin(async (adminId) => {
    const userId = formData.get('user_id') as string
    const role   = formData.get('role') as 'user' | 'admin'

    if (!userId) return { error: 'user_id diperlukan' }
    if (!['user', 'admin'].includes(role)) return { error: 'Role tidak valid' }
    if (userId === adminId && role !== 'admin') return { error: 'Tidak bisa mencabut role admin milik sendiri' }

    const res = await updateProfile(adminId, userId, 'admin.set_role', { role })
    if (res.error) return res
    return { success: true }
  })
}

// ─── Aksi di halaman detail user ────────────────────────────────────────────

/** Perpanjang trial N hari (dari tanggal trial berjalan atau dari hari ini). */
export async function adminExtendTrial(userId: string, days: number) {
  return withAdmin(async (adminId) => {
    if (!Number.isInteger(days) || days < 1 || days > 365) return { error: 'Jumlah hari 1–365' }
    const current = await getProfile(userId)
    const trialEnds = extendFrom(current?.trial_ends_at, days)
    const res = await updateProfile(adminId, userId, 'admin.extend_trial', { subscription_status: 'trial', trial_ends_at: trialEnds })
    if (res.error) return res
    return { success: true, trial_ends_at: trialEnds }
  })
}

/** Set Premium aktif sampai tanggal tertentu (YYYY-MM-DD, akhir hari WIB). */
export async function adminSetPremiumUntil(userId: string, date: string) {
  return withAdmin(async (adminId) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Tanggal tidak valid' }
    const ends = new Date(`${date}T23:59:59+07:00`)
    if (ends.getTime() <= Date.now()) return { error: 'Tanggal harus di masa depan' }
    const current = await getProfile(userId)
    const update: Record<string, unknown> = { subscription_status: 'premium', subscription_ends_at: ends.toISOString() }
    if (current?.subscription_status !== 'premium') update.subscription_started_at = new Date().toISOString()
    const res = await updateProfile(adminId, userId, 'admin.set_premium_until', update)
    if (res.error) return res
    return { success: true, subscription_ends_at: ends.toISOString() }
  })
}

/**
 * Catat pembayaran manual (WhatsApp/transfer) lalu aktifkan/perpanjang Premium
 * sebanyak `months` × 30 hari. Tersimpan di tabel payments (status paid).
 */
export async function adminRecordPayment(input: {
  userId: string
  months: number
  amount: number
  method: string
  note?: string
  sendEmail?: boolean
}) {
  return withAdmin(async (adminId) => {
    const { userId, months, amount, method, note, sendEmail } = input
    if (!Number.isInteger(months) || months < 1 || months > 24) return { error: 'Durasi 1–24 bulan' }
    if (!Number.isFinite(amount) || amount < 0) return { error: 'Nominal tidak valid' }
    if (!method.trim()) return { error: 'Metode pembayaran wajib diisi' }

    const current = await getProfile(userId)
    if (!current) return { error: 'User tidak ditemukan' }

    const now = new Date()
    const orderId = `MANUAL_${userId}_${now.getTime()}`
    const ends = extendFrom(current.subscription_ends_at, months * SUBSCRIPTION_DURATION_DAYS)

    const { error: payErr } = await createAdminClient().from('payments').insert({
      user_id: userId,
      amount: Math.round(amount),
      gateway_reference: 'MANUAL',
      merchant_order_id: orderId,
      idempotency_key: orderId,
      status: 'paid',
      payment_method: method.trim().slice(0, 60),
      paid_at: now.toISOString(),
      raw_webhook_payload: { source: 'admin', admin_id: adminId, months, note: note?.trim() || null },
    })
    if (payErr) return { error: `Gagal mencatat pembayaran: ${payErr.message}` }

    const update: Record<string, unknown> = { subscription_status: 'premium', subscription_ends_at: ends }
    if (current.subscription_status !== 'premium') update.subscription_started_at = now.toISOString()
    const res = await updateProfile(adminId, userId, 'admin.record_payment', { ...update })
    if (res.error) return res

    if (sendEmail && current.email) {
      try {
        await sendPaymentSuccessEmail(current.email, current.full_name ?? 'Pengguna', Math.round(amount), orderId, ends)
      } catch (e) {
        console.error('[admin/payment-email]', e)
      }
    }
    revalidatePath('/admin/payments')
    return { success: true, subscription_ends_at: ends }
  })
}

/** Putuskan koneksi Telegram user (sama seperti tombol Putuskan di Pengaturan user). */
export async function adminDisconnectTelegram(userId: string) {
  return withAdmin(async (adminId) => {
    const res = await updateProfile(adminId, userId, 'admin.disconnect_telegram', { telegram_chat_id: null })
    if (res.error) return res
    return { success: true }
  })
}

/** Hapus kode connect user: membuka kunci (5x gagal) dan mereset batas 3 kode/jam. */
export async function adminResetConnectCodes(userId: string) {
  return withAdmin(async (adminId) => {
    const { data, error } = await createAdminClient().from('connect_codes').delete().eq('user_id', userId).select('id')
    if (error) return { error: error.message }
    await audit(adminId, 'admin.reset_connect_codes', userId, null, { deleted: data?.length ?? 0 })
    revalidatePath('/admin', 'layout')
    return { success: true, deleted: data?.length ?? 0 }
  })
}

// ─── Pengaturan aplikasi ────────────────────────────────────────────────────

export async function adminUpdateSettings(input: {
  promoEnabled: boolean
  promoUntil: string | null
  premiumPrice: number
  graceDays: number
}) {
  return withAdmin(async (adminId) => {
    const { promoEnabled, promoUntil, premiumPrice, graceDays } = input
    if (promoUntil && !/^\d{4}-\d{2}-\d{2}$/.test(promoUntil)) return { error: 'Tanggal promo tidak valid' }
    if (!Number.isInteger(premiumPrice) || premiumPrice < 1000) return { error: 'Harga minimal Rp 1.000' }
    if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 30) return { error: 'Masa tenggang 0–30 hari' }

    const before = await getSettings()
    if (!before.tableReady) {
      return { error: 'Tabel app_settings belum ada. Jalankan supabase/migrations/20260928_app_settings.sql di Supabase SQL Editor.' }
    }
    for (const [key, value] of [
      ['promo', { enabled: promoEnabled, until: promoUntil || null }],
      ['premium_price', premiumPrice],
      ['grace_days', graceDays],
    ] as const) {
      const err = await saveSetting(key, value, adminId)
      if (err) return { error: err }
    }
    await audit(adminId, 'admin.update_settings', adminId,
      { promo: before.promo, premium_price: before.premiumPrice, grace_days: before.graceDays },
      { promo: { enabled: promoEnabled, until: promoUntil || null }, premium_price: premiumPrice, grace_days: graceDays },
      'app_settings')
    revalidatePath('/', 'layout')
    return { success: true }
  })
}

// ─── Broadcast ──────────────────────────────────────────────────────────────

const AUDIENCES: Record<string, string[] | null> = {
  all: null,
  trial: ['trial'],
  premium: ['premium', 'grace_period'],
  expired: ['trial_expired', 'cancelled'],
}

/** Kirim teks polos lewat Bot API (tanpa Markdown supaya karakter bebas aman). */
async function telegramPlain(chatId: number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  })
  const body = await res.json().catch(() => ({}))
  return !!body?.ok
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function adminBroadcast(input: {
  audience: keyof typeof AUDIENCES
  telegram: boolean
  email: boolean
  subject: string
  message: string
}) {
  return withAdmin(async (adminId) => {
    const { audience, telegram, email, subject, message } = input
    if (!(audience in AUDIENCES)) return { error: 'Target tidak valid' }
    if (!telegram && !email) return { error: 'Pilih minimal satu saluran' }
    if (message.trim().length < 5) return { error: 'Pesan terlalu pendek' }
    if (email && !subject.trim()) return { error: 'Subjek email wajib diisi' }

    let query = createAdminClient()
      .from('profiles')
      .select('email, full_name, telegram_chat_id, subscription_status')
      .is('deleted_at', null)
    const statuses = AUDIENCES[audience]
    if (statuses) query = query.in('subscription_status', statuses)
    const { data: users, error } = await query
    if (error) return { error: error.message }

    const sent = { sentTelegram: 0, sentEmail: 0, failed: 0 }
    for (const u of users ?? []) {
      if (telegram && u.telegram_chat_id) {
        if (await telegramPlain(u.telegram_chat_id, message.trim())) sent.sentTelegram++
        else sent.failed++
        await sleep(50) // jauh di bawah limit Telegram (~30 pesan/detik)
      }
      if (email && u.email) {
        try {
          const r = await sendBroadcastEmail(u.email, u.full_name ?? '', subject.trim(), message.trim())
          if (r.error) sent.failed++
          else sent.sentEmail++
        } catch {
          sent.failed++
        }
        await sleep(550) // limit Resend free: 2 email/detik
      }
    }

    await audit(adminId, 'admin.broadcast', adminId, null,
      { audience, telegram, email, subject: subject.trim(), message: message.trim(), recipients: users?.length ?? 0, ...sent },
      'broadcast')
    return { success: true, recipients: users?.length ?? 0, ...sent }
  })
}
