import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { addDays } from 'date-fns'
import { createAdminClient } from '@/utils/supabase/server'
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '@/lib/email'

interface DuitkuCallbackPayload {
  merchantCode: string
  amount: string
  merchantOrderId: string
  productDetail: string
  additionalParam: string
  paymentCode: string
  resultCode: string
  merchantUserId: string
  reference: string
  signature: string
  publisherOrderId?: string
  settlementDate?: string
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.DUITKU_API_KEY
  const merchantCode = process.env.DUITKU_MERCHANT_CODE

  if (!apiKey || !merchantCode) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Duitku sends application/x-www-form-urlencoded
  const formData = await request.formData()
  const payload: Partial<DuitkuCallbackPayload> = {}
  formData.forEach((value, key) => {
    (payload as Record<string, string>)[key] = value.toString()
  })

  const { merchantCode: mc, amount, merchantOrderId, resultCode, signature } = payload

  if (!mc || !amount || !merchantOrderId || !resultCode || !signature) {
    return NextResponse.json({ error: 'Bad Parameter' }, { status: 400 })
  }

  // Validate Duitku signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
  const expectedSignature = crypto
    .createHash('md5')
    .update(`${mc}${amount}${merchantOrderId}${apiKey}`)
    .digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Idempotency check - prevent double processing
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('idempotency_key', payload.reference)
    .eq('status', 'paid')
    .single()

  if (existing) {
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  const isPaid = resultCode === '00'
  const newStatus = isPaid ? 'paid' : resultCode === '01' ? 'pending' : 'failed'

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: newStatus,
      paid_at: isPaid ? new Date().toISOString() : null,
      raw_webhook_payload: payload,
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_order_id', merchantOrderId)

  // Update subscription on successful payment
  if (isPaid) {
    // merchantOrderId format: SUB_{userId}_{timestamp}
    const parts = merchantOrderId.split('_')
    const userId = parts[1]
    if (userId) {
      const subscriptionEndsAt = addDays(new Date(), 30).toISOString()
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'premium',
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: subscriptionEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      // Kirim email konfirmasi pembayaran (non-blocking)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (profile?.email) {
        sendPaymentSuccessEmail(
          profile.email,
          profile.full_name ?? profile.email,
          Number(amount),
          payload.reference ?? merchantOrderId,
          subscriptionEndsAt,
        ).catch(() => {})
      }
    }
  } else if (newStatus === 'failed') {
    // Kirim email pembayaran gagal (non-blocking)
    const parts = merchantOrderId.split('_')
    const userId = parts[1]
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (profile?.email) {
        sendPaymentFailedEmail(profile.email, profile.full_name ?? profile.email).catch(() => {})
      }
    }
  }

  return NextResponse.json({ success: true })
}
