import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { addDays } from 'date-fns'
import { createAdminClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-callback-signature')
  const privateKey = process.env.TRIPAY_PRIVATE_KEY

  if (!privateKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const payload = await request.text()

  // Validate HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', privateKey)
    .update(payload)
    .digest('hex')

  if (signature !== expectedSignature) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
  }

  const data = JSON.parse(payload)
  const supabase = await createAdminClient()

  // Idempotency check
  const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('idempotency_key', data.reference)
    .eq('status', 'paid')
    .single()

  if (existing) {
    return NextResponse.json({ success: true, message: 'Already processed' })
  }

  // Update payment record
  await supabase
    .from('payments')
    .update({
      status: data.status === 'PAID' ? 'paid' : data.status.toLowerCase(),
      paid_at: data.status === 'PAID' ? new Date().toISOString() : null,
      raw_webhook_payload: data,
      updated_at: new Date().toISOString(),
    })
    .eq('tripay_reference', data.reference)

  // Update subscription on successful payment
  if (data.status === 'PAID') {
    const userId = data.merchant_ref?.split('_')[1]
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'premium',
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: addDays(new Date(), 30).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    }
  }

  return NextResponse.json({ success: true })
}
