import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { addDays } from 'date-fns'
import { createAdminClient } from '@/utils/supabase/server'
import { sendPaymentSuccessEmail, sendPaymentFailedEmail } from '@/lib/email'
import { SUBSCRIPTION_DURATION_DAYS } from '@/lib/constants'

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

/**
 * POST /api/webhooks/duitku
 *
 * Duitku payment callback handler. Called by Duitku after a payment attempt.
 *
 * Signature validation (MD5):
 *   MD5(merchantCode + amount + merchantOrderId + apiKey)
 *
 * resultCode values:
 *   '00' = success (payment completed)
 *   '01' = pending (awaiting payment)
 *   other = failed
 *
 * Idempotency: checks for an existing 'paid' record before processing
 * to prevent double-crediting if Duitku sends duplicate callbacks.
 *
 * merchantOrderId format: SUB_{userId}_{timestamp}
 * userId is extracted from index [1] after splitting by '_'.
 */
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

  // Validate signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
  const expectedSignature = crypto
    .createHash('md5')
    .update(`${mc}${amount}${merchantOrderId}${apiKey}`)
    .digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Idempotency check — prevent double processing on duplicate callbacks
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

  // Activate premium subscription on successful payment
  if (isPaid) {
    // merchantOrderId format: SUB_{userId}_{timestamp}
    const parts = merchantOrderId.split('_')
    const userId = parts[1]
    if (userId) {
      const subscriptionEndsAt = addDays(new Date(), SUBSCRIPTION_DURATION_DAYS).toISOString()
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'premium',
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: subscriptionEndsAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      // Send payment confirmation email (non-blocking — failure should not affect response)
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
    // Send payment failure email (non-blocking)
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
